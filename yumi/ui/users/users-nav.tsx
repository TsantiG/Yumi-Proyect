import { SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import CloudImage from '@/lib/cloudinary-config';

export default async function UsersNav() {
  const { user } = useUser();
  const iconuser = "https://res.cloudinary.com/dstpvt64c/image/upload/v1746815396/Yumi%21%21/ctqs2w2trgz1vazfi2ep.webp"

  return (
    <SignedOut>
      <header className="bg-rosa shadow-md py-4 px-6 flex justify-between items-center">
        <CloudImage src={iconuser} alt="icon Yumi!!" />
        <nav className="flex items-center gap-6 text-xl">
          <Link href="/">Inicio</Link>
          <Link href="/">Explorar</Link>
          <Link href="/explorar">Sobre nosotros</Link>
          <Link href="/explorar">inicia sesion</Link>
          <Link href="/explorar">registrate</Link>
        </nav>
      </header>
    </SignedOut>
  );
}