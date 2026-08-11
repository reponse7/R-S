import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
  onComplete?: () => void;
  duration?: number;
}

export function LoadingScreen({ 
  message = "Authenticating...", 
  onComplete,
  duration = 800 
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress < 100) {
        requestAnimationFrame(animate);
      } else if (onComplete) {
        // Add a tiny delay at 100% before triggering complete
        setTimeout(onComplete, 100);
      }
    };

    requestAnimationFrame(animate);
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-slate-900 transition-colors">
      <div className="flex flex-col items-center max-w-sm w-full px-6">
        <div className="flex items-center justify-center mb-6 animate-pulse">
          <img src="/favicon.svg" alt="RS Logo" className="w-16 h-16" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-8 tracking-tight">
          RS Inventory
        </h2>

        <div className="w-full space-y-3">
          <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm font-medium text-center text-gray-500 dark:text-slate-400 animate-pulse">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
