import { AlertTriangle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 py-4">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-squeeze">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">
              Conteúdo educacional. Não constitui recomendação de investimento.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>© 2024 B3 Signal Monitor</span>
            <span className="text-muted-foreground/50">•</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
