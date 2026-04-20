// Dados que chegam no corpo da requisição de login
export type LoginDto = {
  email: string;
  password: string;
};

// Dados que chegam no corpo da requisição de refresh
export type RefreshDto = {
  refresh_token: string;
};

// O que o servidor devolve após um login ou refresh bem-sucedido
export type AuthResponse = {
  access_token: string;   // token de curta duração (~1h), enviado em toda requisição
  refresh_token: string;  // token de longa duração, usado só para renovar o access_token
  user: {
    id: string;
    email: string | null;
    roles: string[];
  };
};
