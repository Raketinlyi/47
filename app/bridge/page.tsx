'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useConnect, useDisconnect, useWalletClient, useSwitchChain } from 'wagmi';
import { Button as UIButton } from '@/components/ui/button';
import { ChevronDown, CheckCircle, AlertTriangle, Loader2, Lock, Unlock, ArrowLeft, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabNavigation } from '@/components/tab-navigation';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ethers } from 'ethers';
import Image from 'next/image';
import { connectWalletWithFallback } from '@/lib/wallet/connectFlow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import { useMobile } from '@/hooks/use-mobile';
import { WalletConnectNoSSR as WalletConnect } from '@/components/web3/wallet-connect.no-ssr';
import { formatBridgeError } from '@/lib/bridgeErrors';
import { fetchAllBalances } from '@/lib/bridgeUtils';

const Button = UIButton as any;

// --- Bridge Configuration ---
const CONTRACT_ADDRESS = '0x4bb09F3e7b4D79920dF4A90852a7a1b9aAD4Ff8B';
const CRAA_TOKEN_ADDRESS = '0xBb526D657Cc1Ba772469A6EC96AcB2ed9D2A93e5';

const EIDS = {
  apechain: 30312,
  monad: 30390,
  abstract: 30324,
  berachain: 30362,
} as const;

const NETWORKS = {
  apechain: {
    id: 33139,
    eid: EIDS.apechain,
    name: 'ApeChain',
    symbol: 'APE',
    token: 'CRAA',
    color: 'from-blue-500 to-cyan-500',
    iconPath: '/images/chains/apechain.png',
    rpc: 'https://rpc.apechain.com',
  },
  monad: {
    id: 143,
    eid: EIDS.monad,
    name: 'Monad',
    symbol: 'MON',
    token: 'CRAA',
    color: 'from-purple-500 to-pink-500',
    iconPath: '/images/chains/monad.png',
    rpc: process.env.NEXT_PUBLIC_MONAD_RPC || 'https://rpc.monad.xyz',
  },
  abstract: {
    id: 2741,
    eid: EIDS.abstract,
    name: 'Abstract',
    symbol: 'ETH',
    token: 'CRAA',
    color: 'from-emerald-500 to-teal-500',
    iconPath: '/images/chains/abstract.png',
    rpc: 'https://api.mainnet.abs.xyz',
  },
  berachain: {
    id: 80094,
    eid: EIDS.berachain,
    name: 'Berachain',
    symbol: 'BERA',
    token: 'CRAA',
    color: 'from-orange-500 to-amber-500',
    iconPath: '/images/chains/berachain.png',
    rpc: 'https://rpc.berachain.com',
  },
} as const;

type NetworkKey = keyof typeof NETWORKS;
type BridgeStatus = 'idle' | 'preparing' | 'processing' | 'success' | 'error';

// Minimal ABIs
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

const OFT_ABI = [
  'function quoteSend(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) sendParam, bool payInLzToken) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))',
  'function send(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) sendParam, tuple(uint256 nativeFee, uint256 lzTokenFee) fee, address refundAddress) external payable',
  'function token() external view returns (address)',
  'function balanceOf(address account) external view returns (uint256)',
];

const BridgeStatusIndicator = ({ status }: { status: BridgeStatus }) => {
  const config = {
    idle: { text: 'Ready', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: <Unlock className='w-4 h-4' /> },
    preparing: { text: 'Preparing...', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: <Loader2 className='w-4 h-4 animate-spin' /> },
    processing: { text: 'Processing...', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: <Loader2 className='w-4 h-4 animate-spin' /> },
    success: { text: 'Complete!', color: 'text-green-400', bg: 'bg-green-500/10', icon: <CheckCircle className='w-4 h-4' /> },
    error: { text: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10', icon: <AlertTriangle className='w-4 h-4' /> },
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center space-x-2 px-4 py-2 rounded-full border border-white/5 ${config.bg} backdrop-blur-sm`}
    >
      {config.icon}
      <span className={`font-medium ${config.color}`}>{config.text}</span>
    </motion.div>
  );
};

export default function BridgePage() {
  const { t } = useTranslation();
  const { isConnected, chainId, address } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const [mounted, setMounted] = useState(false);
  const { isMobile } = useMobile();

  const [fromNet, setFromNet] = useState<NetworkKey>('apechain');
  const [toNet, setToNet] = useState<NetworkKey>('monad');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<BridgeStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [txHash, setTxHash] = useState('');
  const [balance, setBalance] = useState('0');
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Multi-chain balances
  const [allBalances, setAllBalances] = useState<Record<string, string>>({
    apechain: '0',
    monad: '0',
    abstract: '0',
    berachain: '0',
  });

  // LayerZero tracking
  const [lzStatus, setLzStatus] = useState<'idle' | 'inflight' | 'delivered'>('idle');
  const [lzDstTxHash, setLzDstTxHash] = useState('');
  const [bridgeStartTime, setBridgeStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [initialDestBalance, setInitialDestBalance] = useState<number | null>(null);

  const handleAmountChange = (value: string) => {
    const normalized = value.replace(',', '.');
    if (!/^\d*\.?\d*$/.test(normalized)) return;
    const [whole, fraction] = normalized.split('.');
    const safeWhole = whole ?? '';
    const safeFraction = fraction ?? '';
    const trimmed = safeFraction ? `${safeWhole}.${safeFraction.slice(0, 18)}` : safeWhole;
    setAmount(trimmed);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch balances for all networks
  useEffect(() => {
    if (!address) {
      setAllBalances({ apechain: '0', monad: '0', abstract: '0', berachain: '0' });
      return;
    }

    const loadBalances = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const balances = await fetchAllBalances(address);
      setAllBalances(balances);
      // Also set the FROM network balance for display
      setBalance(balances[fromNet] || '0');
    };

    loadBalances();
    const interval = setInterval(loadBalances, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [address, fromNet]);

  // Polling / Timer effect
  useEffect(() => {
    if (!bridgeStartTime || lzStatus === 'delivered') {
      if (lzStatus === 'delivered') return;
      setElapsedTime(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - bridgeStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [bridgeStartTime, lzStatus]);

  // Poll Balance for delivery confirmation
  useEffect(() => {
    if (!bridgeStartTime || !txHash || status === 'success' || !address) return;

    let cancelled = false;
    const pollInterval = setInterval(async () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      const balances = await fetchAllBalances(address);
      const currentDestBalance = parseFloat(balances[toNet] || '0');

      if (initialDestBalance !== null) {
        if (currentDestBalance > initialDestBalance) {
          setLzStatus('delivered');
          setStatus('success');
          setAllBalances(balances);
          setBalance(balances[fromNet] || '0');
          clearInterval(pollInterval);
          return;
        }
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [bridgeStartTime, txHash, status, address, toNet, initialDestBalance, fromNet]);

  const handleBridge = async () => {
    setErrorMsg('');
    setStatus('idle');

    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg('Enter valid amount');
      return;
    }

    if (fromNet === toNet) {
      setErrorMsg('Cannot bridge to the same network');
      return;
    }

    try {
      setStatus('preparing');

      const targetChainId = NETWORKS[fromNet].id;
      if (chainId !== targetChainId) {
        try {
          await switchChainAsync({ chainId: targetChainId });
        } catch (e) {
          setErrorMsg(`Switch to ${NETWORKS[fromNet].name} failed`);
          setStatus('idle');
          return;
        }
      }

      if (!walletClient) {
        setErrorMsg('Wallet connection issue');
        setStatus('idle');
        return;
      }

      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const amountLD = ethers.parseUnits(amount, 18);

      const oft = new ethers.Contract(CONTRACT_ADDRESS, OFT_ABI, signer) as any;

      // On ApeChain (Source of Truth), we need to approve the OFT Adapter
      if (fromNet === 'apechain') {
        const token = new ethers.Contract(CRAA_TOKEN_ADDRESS, ERC20_ABI, signer) as any;
        const allowance = await token.allowance(userAddress, CONTRACT_ADDRESS);
        if (Number(allowance) < Number(amountLD)) {
          const txApprove = await token.approve(CONTRACT_ADDRESS, amountLD);
          await txApprove.wait();
        }
      }

      const toAddressBytes32 = ethers.zeroPadValue(userAddress, 32);
      const sendParam = {
        dstEid: NETWORKS[toNet].eid,
        to: toAddressBytes32,
        amountLD: amountLD,
        minAmountLD: amountLD,
        extraOptions: "0x",
        composeMsg: "0x",
        oftCmd: "0x",
      };

      const [nativeFee] = await oft.quoteSend(sendParam, false);

      setStatus('processing');

      const txOptions: any = { value: nativeFee };

      // Abstract specific L2 options if needed
      if (fromNet === 'abstract') {
        txOptions.gasLimit = 1000000;
        const feeData = await provider.getFeeData();
        if (feeData.gasPrice) txOptions.gasPrice = feeData.gasPrice;
        txOptions.type = 0;
      }

      const balancesBefore = await fetchAllBalances(userAddress);
      setInitialDestBalance(parseFloat(balancesBefore[toNet] || '0'));

      const tx = await oft.send(sendParam, { nativeFee: nativeFee, lzTokenFee: 0 }, userAddress, txOptions);
      setTxHash(tx.hash);

      await tx.wait();

      setBridgeStartTime(Date.now());
      setStatus('processing');
      setLzStatus('inflight');

    } catch (e: any) {
      console.error(e);
      setErrorMsg(formatBridgeError(e));
      setStatus('error');
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connectWalletWithFallback({
        isMobile,
        connectors,
        connectAsync,
        disconnectAsync,
      });
    } catch (error) {
      console.warn('Wallet connect failed:', error);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className='min-h-screen mobile-content-wrapper relative bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-4'>
      <div className='fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900' />
      <div className='fixed inset-0 -z-5 bg-gradient-to-t from-transparent via-purple-800/10 to-transparent' />
      <div className='fixed inset-0 -z-5 bg-gradient-to-r from-transparent via-indigo-800/10 to-transparent' />

      <div className='container mx-auto relative z-10'>
        <header className='page-header mobile-header-fix mobile-safe-layout'>
          <Link href='/'>
            <Button
              variant='outline'
              className='relative overflow-hidden border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 text-amber-100'
            >
              <ArrowLeft className='mr-2 w-4 h-4' />
              <span className='font-semibold'>{t('navigation.home', 'Home')}</span>
            </Button>
          </Link>
          <div className='flex-1 flex justify-center min-w-0'>
            {!isMobile && <TabNavigation />}
          </div>
          <div className='flex items-center flex-shrink-0'>
            {(!isMobile || isConnected) && <WalletConnect />}
          </div>
        </header>

        <div className='max-w-md mx-auto relative z-10 mt-4'>
          <Card className="bg-gray-900/60 backdrop-blur-2xl border-white/10 shadow-2xl rounded-3xl">
            <div className="relative h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-x" />

            <CardContent className="p-4 space-y-4">
              {/* FROM Network */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium uppercase text-gray-400">
                  <span>From</span>
                  <span className="text-purple-300">Bal: {parseFloat(balance).toLocaleString()} CRAA</span>
                </div>
                <Select value={fromNet} onValueChange={(v: NetworkKey) => { setFromNet(v); if (v === toNet) setToNet(fromNet === 'apechain' ? 'monad' : 'apechain'); }}>
                  <SelectTrigger className="w-full bg-black/40 border-white/10 h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900/95 border-white/10 text-white backdrop-blur-xl">
                    {Object.entries(NETWORKS).map(([key, net]) => (
                      <SelectItem key={key} value={key} disabled={key === toNet}>
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden">
                            <Image src={net.iconPath} alt={net.name} fill className="object-cover" />
                          </div>
                          <span className="font-bold">{net.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Arrow */}
              <div className="flex justify-center -my-3 relative z-10">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  className="bg-gray-800 p-2 rounded-full border border-white/10 shadow-xl cursor-pointer"
                  onClick={() => {
                    const temp = fromNet;
                    setFromNet(toNet);
                    setToNet(temp);
                  }}
                >
                  <ChevronDown className="w-5 h-5 text-purple-400" />
                </motion.div>
              </div>

              {/* TO Network */}
              <div className="space-y-2">
                <span className="text-xs font-medium uppercase text-gray-400">To</span>
                <Select value={toNet} onValueChange={(v: NetworkKey) => { setToNet(v); if (v === fromNet) setFromNet(toNet === 'apechain' ? 'monad' : 'apechain'); }}>
                  <SelectTrigger className="w-full bg-black/40 border-white/10 h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900/95 border-white/10 text-white backdrop-blur-xl">
                    {Object.entries(NETWORKS).map(([key, net]) => (
                      <SelectItem key={key} value={key} disabled={key === fromNet}>
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden">
                            <Image src={net.iconPath} alt={net.name} fill className="object-cover" />
                          </div>
                          <span className="font-bold">{net.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium uppercase text-gray-400">
                  <span>Amount</span>
                  <button onClick={() => setAmount(balance)} className="text-pink-400 hover:text-pink-300 font-bold">MAX</button>
                </div>
                <div className="relative group">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="bg-black/40 border-white/10 h-12 text-2xl font-bold pr-16 rounded-xl"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">CRAA</div>
                </div>
              </div>

              {/* Status/Logs */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                  </motion.div>
                )}
                {lzStatus !== 'idle' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-3 rounded-lg text-sm flex flex-col gap-2 ${lzStatus === 'delivered' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {lzStatus === 'delivered' ? <CheckCircle className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                        <span className="font-semibold uppercase">LayerZero: {lzStatus === 'delivered' ? 'Delivered' : 'In Flight'}</span>
                      </div>
                      <div className="font-mono text-xs opacity-70">
                        {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <a href={`https://layerzeroscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 text-xs">
                      <ExternalLink className="w-3 h-3" />
                      Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dashboard */}
              {address && (
                <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Your Balances</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(allBalances).map(([key, bal]) => (
                      <div key={key} className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 capitalize">{key}:</span>
                        <span className="font-mono text-white">{parseFloat(bal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action */}
              {!isConnected ? (
                !isMobile && (
                  <Button onClick={handleConnectWallet} className="w-full bg-purple-600 hover:bg-purple-500 h-12 text-lg font-bold rounded-xl shadow-lg">Connect Wallet</Button>
                )
              ) : (
                <Button onClick={handleBridge} disabled={status === 'preparing' || status === 'processing'} className={cn("w-full h-12 text-lg font-bold rounded-xl", status === 'processing' ? "bg-gray-700" : "bg-gradient-to-r from-blue-600 to-purple-600")}>
                  {status === 'processing' ? 'Bridging...' : 'Bridge CRAA'}
                </Button>
              )}

              <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest opacity-60">
                <Lock className="w-3 h-3" />
                <span>Secure Bridge Protocol Active</span>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center space-y-2">
            <div className="inline-block px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
              <p className="text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Powered by LayerZero V2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
