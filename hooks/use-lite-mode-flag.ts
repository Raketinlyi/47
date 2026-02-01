import { useEffect, useState } from 'react';

export function useLiteModeFlag() {
  const [isLiteMode, setIsLiteMode] = useState(false);

  useEffect(() => {
    const checkLiteMode = () => {
      const hasLiteModeClass = document.body.classList.contains('lite-mode');
      const hasLiteModeAttr = document.body.hasAttribute('data-lite-mode');
      setIsLiteMode(hasLiteModeClass || hasLiteModeAttr);
    };

    // РџСЂРѕРІРµСЂСЏРµРј СЃСЂР°Р·Сѓ
    checkLiteMode();

    // РќР°Р±Р»СЋРґР°РµРј Р·Р° РёР·РјРµРЅРµРЅРёСЏРјРё
    const observer = new MutationObserver(checkLiteMode);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-lite-mode'],
    });

    return () => observer.disconnect();
  }, []);

  return isLiteMode;
}
