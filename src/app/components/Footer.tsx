export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <hr className="border-gray-200 mb-6" />

        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
            <img src="/Logo_CIFP.png" alt="CIFP Felipe VI" className="h-12 w-auto object-contain" />
            <div className="flex flex-col items-center gap-1">
              <img src="/logo_nos_impulsa.png" alt="Nos Impulsa" className="h-12 w-auto object-contain" />
              <span className="text-[10px] text-gray-400 font-mono">AE-PUB-2025-094</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 flex items-center gap-1.5 justify-center flex-wrap">
            Sistema de Reservas de Comedor del CIFP Felipe VI — Segovia
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1">
              CC BY-NC-SA 4.0
              <img src="/logo_creative_commons.jpg" alt="Creative Commons" className="h-4 w-auto inline-block" />
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
