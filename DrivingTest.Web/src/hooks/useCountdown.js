import { useEffect, useRef, useState } from 'react';

/**
 * Đếm ngược tới mốc `expiresAt` (ms, giờ server). `serverOffset` = giờ server - giờ máy khách,
 * nên đồng hồ không bị lệch dù máy người dùng chỉnh sai giờ. Tính theo mốc tuyệt đối nên không trôi khi tab bị ngủ.
 */
export function useCountdown(expiresAt, serverOffset, onExpire) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - (Date.now() + serverOffset)));
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const r = Math.max(0, expiresAt - (Date.now() + serverOffset));
      setRemaining(r);
      if (r === 0 && !fired) {
        fired = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [expiresAt, serverOffset]);

  return remaining;
}
