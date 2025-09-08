'use client';

import { usePathname } from 'next/navigation';
import TopBar from './TopBar';

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showTopBar = pathname !== '/'; // hide on the login page
  return (
    <>
      {showTopBar && <TopBar />}
      {children}
    </>
  );
}
