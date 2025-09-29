
'use client';
import { useState } from 'react';

export default function Entrar() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    setMsg('');
    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem('token', data.token);
      setMsg('Login realizado com sucesso!');
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Usuário ou E-mail" value={usuario} onChange={e=>setUsuario(e.target.value)} />
      <input placeholder="Senha" type="password" value={senha} onChange={e=>setSenha(e.target.value)} />
      <button type="submit">Entrar</button>
      <p>{msg}</p>
    </form>
  );
}
