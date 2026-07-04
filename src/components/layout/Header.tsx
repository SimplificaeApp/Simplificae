import { Building2, User, ChevronDown, LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";

export function Header({ workspaces = [], user }: { workspaces?: any[], user?: any }) {
  const currentWorkspace = workspaces[0];
  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-4">
        {/* Workspace Selector */}
        {currentWorkspace && (
          <button className="flex items-center gap-2 hover:bg-slate-50 px-3 py-1.5 rounded-md transition-colors border border-slate-200">
            {currentWorkspace.type === 'personal' ? (
              <User className="w-4 h-4 text-emerald-600" />
            ) : (
              <Building2 className="w-4 h-4 text-blue-600" />
            )}
            <span className="font-semibold text-sm text-slate-700">{currentWorkspace.name}</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-500 hidden md:inline-block">
          Olá, <span className="text-slate-800 font-bold">{firstName}</span>!
        </span>
        
        <form action={logout}>
          <button type="submit" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors bg-slate-50 hover:bg-rose-50 px-3 py-2 rounded-lg">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline-block">Sair</span>
          </button>
        </form>
      </div>
    </header>
  );
}
