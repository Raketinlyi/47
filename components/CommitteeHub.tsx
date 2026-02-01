import React from 'react';

export const CommitteeHub: React.FC = () => {
  const members = [
    { name: 'Alex', role: 'Lead', addr: '0xAbc...123' },
    { name: 'Ira', role: 'Moderator', addr: '0xDef...456' },
    { name: 'Misha', role: 'Treasurer', addr: '0x789...ghi' },
  ];

  return (
    <div className='max-w-4xl mx-auto p-6'>
      <h2 className='text-2xl font-bold mb-2'>Committee Hub</h2>
      <p className='mb-4 text-gray-300'>
        Central place to view committee members and basic actions.
      </p>

      <div className='bg-[#121212] border border-white/5 rounded-lg p-4'>
        <ul className='space-y-3'>
          {members.map(m => (
            <li
              key={m.addr}
              className='flex items-center justify-between p-3 bg-black/60 rounded-md'
            >
              <div>
                <div className='font-semibold'>
                  {m.name}{' '}
                  <span className='text-sm text-gray-400'>В· {m.role}</span>
                </div>
                <div className='text-xs text-gray-500'>{m.addr}</div>
              </div>
              <div className='flex items-center gap-2'>
                <button className='px-3 py-1 bg-green-600 text-white rounded text-sm'>
                  Message
                </button>
                <button className='px-3 py-1 bg-yellow-600 text-black rounded text-sm'>
                  Propose
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CommitteeHub;
