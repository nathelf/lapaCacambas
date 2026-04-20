import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, ClipboardList, Container,
  Truck, UserCog, Wrench, Receipt, FileText, Wallet,
  TrendingUp, Package, Boxes, Settings, BarChart3, ChevronDown,
  MessageSquare, AlertTriangle, MapPin, Tag
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { label: string; path: string }[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    title: 'OPERAÇÕES',
    items: [
      { label: 'Pedidos', icon: ClipboardList, path: '/pedidos' },
      { label: 'Ordens de Serviço', icon: FileText, path: '/ordens-servico' },
      { label: 'Clientes', icon: Users, path: '/clientes' },
      { label: 'Obras', icon: Building2, path: '/obras' },
      { label: 'Comercial', icon: TrendingUp, path: '/comercial' },
      { label: 'Serviços', icon: Tag, path: '/servicos' },
    ],
  },
  {
    title: 'FROTA & LOGÍSTICA',
    items: [
      { label: 'Caçambas', icon: Container, path: '/cacambas' },
      { label: 'Caminhões', icon: Truck, path: '/veiculos' },
      { label: 'Motoristas', icon: UserCog, path: '/motoristas' },
      { label: 'Máquinas', icon: Wrench, path: '/maquinas' },
      { label: 'Rotas', icon: MapPin, path: '/rotas' },
      { label: 'Rastreamento', icon: MapPin, path: '/rastreamento' },
    ],
  },
  {
    title: 'FINANCEIRO',
    items: [
      {
        label: 'Financeiro', icon: Wallet, children: [
          { label: 'Faturas', path: '/financeiro/faturas' },
          { label: 'Boletos', path: '/financeiro/boletos' },
          { label: 'Contas a Pagar', path: '/financeiro/contas' },
          { label: 'Fluxo de Caixa', path: '/financeiro/fluxo-caixa' },
          { label: 'Inadimplência', path: '/financeiro/inadimplencia' },
        ],
      },
      { label: 'Fiscal', icon: Receipt, path: '/fiscal' },
    ],
  },
  {
    title: 'COMUNICAÇÃO',
    items: [
      { label: 'WhatsApp', icon: MessageSquare, path: '/whatsapp' },
      { label: 'Ocorrências', icon: AlertTriangle, path: '/ocorrencias' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { label: 'Relatórios', icon: BarChart3, path: '/relatorios' },
      { label: 'Fornecedores', icon: Package, path: '/fornecedores' },
      { label: 'Materiais', icon: Boxes, path: '/materiais' },
      { label: 'Usuários', icon: Users, path: '/usuarios' },
      { label: 'Configurações', icon: Settings, path: '/configuracoes' },
    ],
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (label: string) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col overflow-y-auto"
      style={{
        width: 'var(--sidebar-width)',
        background: 'hsl(var(--sidebar-bg))',
        borderRight: '1px solid hsl(var(--sidebar-border))',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--sidebar-active))' }}>
          <Container className="w-4 h-4" style={{ color: 'hsl(var(--sidebar-active-fg))' }} />
        </div>
        <div>
          <div className="font-bold text-sm" style={{ color: 'hsl(var(--sidebar-fg))' }}>LAPA</div>
          <div className="text-[10px]" style={{ color: 'hsl(var(--sidebar-muted))' }}>Locações</div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-2 px-2">
        {menuSections.map((section) => (
          <div key={section.title}>
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              if (item.children) {
                const isExp = expanded[item.label] ?? false;
                const childActive = item.children.some(c => isActive(c.path));
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={`sidebar-item w-full justify-between ${childActive ? 'active' : ''}`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                    </button>
                    {isExp && (
                      <div className="ml-7 space-y-0.5">
                        {item.children.map(child => (
                          <button
                            key={child.path}
                            onClick={() => navigate(child.path)}
                            className={`sidebar-item w-full text-xs ${isActive(child.path) ? 'active' : ''}`}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path!)}
                  className={`sidebar-item w-full ${isActive(item.path) ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
