import Link from "next/link";

export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#03030b] px-6 text-white">
      <section className="text-center">
        <h1 className="text-4xl font-black tracking-[0.08em]">UNICORE</h1>
        <p className="mt-4 text-sm text-white/55">
          La landing page estará disponible próximamente.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[#4067c9] px-6 text-sm font-semibold transition-colors hover:bg-[#5278d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7898ef]"
        >
          Iniciar sesión
        </Link>
      </section>
    </main>
  );
}
