import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { LogIn, User as UserIcon } from 'lucide-react';

const AUTH_API = `${API_BASE_URL}/auth`;

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await axios.post(`${AUTH_API}/login`, { username, password });
      const { token, roles } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user_roles', JSON.stringify(roles));
      navigate('/admin');
    } catch {
      setError('Błędne dane logowania.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LogIn className="text-white" size={24} />
        </div>
        <h2 className="text-2xl font-black mb-6 dark:text-white uppercase tracking-tight text-center">Panel Logowania</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Użytkownik"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>
          <input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            Zaloguj
          </button>
          <Link
            to="/"
            className="block w-full text-center text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Wróć do serwisu
          </Link>
        </form>
        {error && <p className="mt-4 text-red-500 text-xs font-bold text-center">{error}</p>}
      </div>
    </div>
  );
};

export default Login;
