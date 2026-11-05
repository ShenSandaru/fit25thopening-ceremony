import { PROJECT_NAME } from "@fit-expo/shared";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold text-navy-blue sm:text-5xl">{PROJECT_NAME}</h1>
      <div aria-hidden="true" className="h-1 w-24 rounded-full bg-gold" />
      <p className="max-w-xl text-lg">Faculty of Information Technology, University of Moratuwa</p>
      <p className="text-sm">Development scaffold. Ceremony interfaces are not implemented yet.</p>
    </main>
  );
}
