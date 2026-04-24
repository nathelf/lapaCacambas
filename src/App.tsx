import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/auth/LoginPage";
import ClientesPage from "./pages/clientes/ClientesPage";
import ClienteFormPage from "./pages/clientes/ClienteFormPage";
import PedidosPage from "./pages/pedidos/PedidosPage";
import PedidoFormPage from "./pages/pedidos/PedidoFormPage";
import PedidoDetalhePage from "./pages/pedidos/PedidoDetalhePage";
import ObrasPage from "./pages/obras/ObrasPage";
import CacambasPage from "./pages/cacambas/CacambasPage";
import VeiculosPage from "./pages/veiculos/VeiculosPage";
import MotoristasPage from "./pages/motoristas/MotoristasPage";
import FaturasPage from "./pages/financeiro/FaturasPage";
import BoletosPage from "./pages/financeiro/BoletosPage";
import ContasPage from "./pages/financeiro/ContasPage";
import FluxoCaixaPage from "./pages/financeiro/FluxoCaixaPage";
import InadimplenciaPage from "./pages/financeiro/InadimplenciaPage";
import FornecedoresPage from "./pages/fornecedores/FornecedoresPage";
import MateriaisPage from "./pages/materiais/MateriaisPage";
import ConfiguracoesPage from "./pages/configuracoes/ConfiguracoesPage";
import RelatoriosPage from "./pages/relatorios/RelatoriosPage";
import UsuariosPage from "./pages/usuarios/UsuariosPage";
import ComercialPage from "./pages/comercial/ComercialPage";
import ServicosPage from "./pages/servicos/ServicosPage";
import OrdensServicoPage from "./pages/ordens-servico/OrdensServicoPage";
import MaquinasPage from "./pages/maquinas/MaquinasPage";
import RotasPage from "./pages/rotas/RotasPage";
import RastreamentoPage from "./pages/rastreamento/RastreamentoPage";
import FiscalPage from "./pages/fiscal/FiscalPage";
import WhatsAppPage from "./pages/whatsapp/WhatsAppPage";
import OcorrenciasPage from "./pages/ocorrencias/OcorrenciasPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/clientes/novo" element={<ClienteFormPage />} />
        <Route path="/clientes/:id" element={<ClienteFormPage />} />
        <Route path="/pedidos" element={<PedidosPage />} />
        <Route path="/pedidos/novo" element={<PedidoFormPage />} />
        <Route path="/pedidos/:id" element={<PedidoDetalhePage />} />
        <Route path="/ordens-servico" element={<OrdensServicoPage />} />
        <Route path="/obras" element={<ObrasPage />} />
        <Route path="/comercial" element={<ComercialPage />} />
        <Route path="/servicos" element={<ServicosPage />} />
        <Route path="/cacambas" element={<CacambasPage />} />
        <Route path="/veiculos" element={<VeiculosPage />} />
        <Route path="/motoristas" element={<MotoristasPage />} />
        <Route path="/maquinas" element={<MaquinasPage />} />
        <Route path="/rotas" element={<RotasPage />} />
        <Route path="/rastreamento" element={<RastreamentoPage />} />
        <Route path="/financeiro/faturas" element={<FaturasPage />} />
        <Route path="/financeiro/boletos" element={<BoletosPage />} />
        <Route path="/financeiro/contas" element={<ContasPage />} />
        <Route path="/financeiro/fluxo-caixa" element={<FluxoCaixaPage />} />
        <Route path="/financeiro/inadimplencia" element={<InadimplenciaPage />} />
        <Route path="/fiscal" element={<FiscalPage />} />
        <Route path="/whatsapp" element={<WhatsAppPage />} />
        <Route path="/ocorrencias" element={<OcorrenciasPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/fornecedores" element={<FornecedoresPage />} />
        <Route path="/materiais" element={<MateriaisPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TenantProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </AuthProvider>
        </TenantProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
