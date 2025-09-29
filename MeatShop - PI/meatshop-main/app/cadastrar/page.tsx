
'use client';
import { useState } from 'react';

export default function Cadastrar() {
  const [form, setForm] = useState<any>({});
  const [msg, setMsg] = useState('');

  function set(k: string, v: string) {
    setForm((prev:any)=>({...prev,[k]:v}));
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setMsg('');
    if (form.senha !== form.confirmar) {
      setMsg('As senhas não conferem');
      return;
    }
    try {
      const payload = { ...form };
      delete payload.confirmar;
      const res = await fetch('http://localhost:3001/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg('Cadastro realizado com sucesso!');
    } catch (err:any) {
      setMsg(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Nome Fantasia" onChange={e=>set('nomeFantasia', e.target.value)} />
      <input placeholder="Razão Social" onChange={e=>set('razaoSocial', e.target.value)} />
      <input placeholder="CNPJ" onChange={e=>set('cnpj', e.target.value)} />
      <input placeholder="Telefone" onChange={e=>set('telefone', e.target.value)} />
      <input placeholder="Celular" onChange={e=>set('celular', e.target.value)} />
      <input placeholder="CEP" onChange={e=>set('cep', e.target.value)} />
      <input placeholder="Logradouro" onChange={e=>set('logradouro', e.target.value)} />
      <input placeholder="Número" onChange={e=>set('numero', e.target.value)} />
      <input placeholder="Complemento" onChange={e=>set('complemento', e.target.value)} />
      <input placeholder="Bairro" onChange={e=>set('bairro', e.target.value)} />
      <input placeholder="Cidade" onChange={e=>set('cidade', e.target.value)} />
      <input placeholder="Estado" onChange={e=>set('estado', e.target.value)} />
      <input placeholder="País" onChange={e=>set('pais', e.target.value)} />
      <input placeholder="E-mail" onChange={e=>set('email', e.target.value)} />
      <input placeholder="Usuário" onChange={e=>set('usuario', e.target.value)} />
      <input placeholder="Senha" type="password" onChange={e=>set('senha', e.target.value)} />
      <input placeholder="Confirmação de Senha" type="password" onChange={e=>set('confirmar', e.target.value)} />
      <button type="submit">Cadastrar</button>
      <p>{msg}</p>
    </form>
  );
}
