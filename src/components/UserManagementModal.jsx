import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, Shield, Trash2, Users, X, UserRound, Check, LoaderCircle, ChevronDown, FileLock2 } from 'lucide-react';
import { apiRequest } from '../api';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10';

export default function UserManagementModal({ onClose, currentUser }) {
  const [tab, setTab] = useState(currentUser?.role === 'admin' ? 'users' : 'password');
  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState([]);
  const [editingAccessUser, setEditingAccessUser] = useState(null);
  const [accessDraft, setAccessDraft] = useState([]);
  const [accessSaving, setAccessSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    try {
      const result = await apiRequest('/auth/users');
      setUsers(result.users || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadUsers();
      apiRequest('/pages')
        .then(result => setPages(result.pages || []))
        .catch(err => setError(err.message));
    }
  }, [currentUser?.role]);

  const editPageAccess = (user) => {
    setEditingAccessUser(editingAccessUser === user.id ? null : user.id);
    setAccessDraft(user.allowedPages || []);
    setError('');
    setNotice('');
  };

  const savePageAccess = async (user) => {
    setError('');
    setNotice('');
    setAccessSaving(true);
    try {
      await apiRequest(`/auth/users/${user.id}/pages`, {
        method: 'PUT',
        body: JSON.stringify({ pageIds: accessDraft })
      });
      await loadUsers();
      setEditingAccessUser(null);
      setNotice(`Pages autorisées mises à jour pour ${user.username}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setAccessSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (tab === 'users') {
        await apiRequest('/auth/users', {
          method: 'POST',
          body: JSON.stringify({ username, password, role })
        });
        setUsername('');
        setPassword('');
        setRole('user');
        await loadUsers();
        setNotice('Utilisateur créé avec succès.');
      } else {
        await apiRequest('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
        });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setNotice('Mot de passe modifié avec succès.');
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Supprimer le compte « ${user.username} » ?`)) return;
    setError('');
    setNotice('');
    try {
      await apiRequest(`/auth/users/${user.id}`, { method: 'DELETE' });
      await loadUsers();
      setNotice(`Utilisateur ${user.username} supprimé.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const closeOnEscape = (event) => {
    if (event.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={closeOnEscape}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-modal-title"
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* HEADER - Solid dark theme so text is always high-contrast */}
        <header className="relative overflow-hidden bg-slate-900 px-6 sm:px-8 pt-7 pb-6 text-white border-b border-slate-800">
          <div className="absolute -right-8 -top-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/20 border border-indigo-400/20 text-indigo-300 shadow-inner">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Espace Studio</p>
                <h2 id="user-modal-title" className="text-xl font-bold text-white tracking-tight">Comptes & Sécurité</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Connecté en tant que <span className="font-semibold text-white">{currentUser?.username || 'Utilisateur'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Fermer"
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/15 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* TABS */}
          {currentUser?.role === 'admin' ? (
            <div className="relative mt-5 flex gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
              <button
                type="button"
                onClick={() => { setTab('users'); setError(''); setNotice(''); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                  tab === 'users'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Utilisateurs</span>
              </button>
              <button
                type="button"
                onClick={() => { setTab('password'); setError(''); setNotice(''); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                  tab === 'password'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Mon mot de passe</span>
              </button>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400">
              Gérez votre mot de passe de connexion en toute sécurité.
            </div>
          )}
        </header>

        {/* MODAL BODY */}
        <div className="max-h-[68vh] overflow-y-auto bg-slate-50/70 px-6 py-6 sm:px-8">
          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
              <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-medium">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {tab === 'users' ? (
            <>
              {/* Header List */}
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Utilisateurs enregistrés</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Gérez les accès et rôles à votre espace studio.</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-xs border border-slate-200">
                  {users.length} compte{users.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Users list */}
              <ul className="mb-6 space-y-2">
                {users.map(user => (
                  <li
                    key={user.id}
                    className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          user.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {user.username}
                          </span>
                          {user.id === currentUser?.id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                              Vous
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          {user.role === 'admin' ? (
                            <>
                              <Shield className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              <span className="font-medium text-slate-700">Administrateur</span>
                            </>
                          ) : (
                            <>
                              <UserRound className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>Utilisateur</span>
                            </>
                          )}
                        </p>
                      </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {user.role !== 'admin' && <button
                          onClick={() => editPageAccess(user)}
                          title="Gérer les pages autorisées"
                          aria-label={`Gérer les pages autorisées de ${user.username}`}
                          className={`rounded-lg p-2 transition-colors cursor-pointer ${editingAccessUser === user.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:bg-indigo-50 hover:text-indigo-700'}`}
                        ><FileLock2 className="h-4 w-4" /></button>}
                        {user.id !== currentUser?.id && <button
                          onClick={() => deleteUser(user)}
                          title={`Supprimer ${user.username}`}
                          aria-label={`Supprimer ${user.username}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        ><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </div>

                    {editingAccessUser === user.id && <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-semibold text-slate-800">Pages accessibles</p><p className="mt-0.5 text-[11px] text-slate-500">Coche les pages autorisées. Les pages décochées seront interdites.</p></div><div className="flex items-center gap-2"><span className="text-[10px] text-slate-400">{accessDraft.length}/{pages.length} autorisée(s)</span><button type="button" onClick={() => setAccessDraft(pages.map(page => page.id))} className="rounded-md px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-50">Tout autoriser</button><button type="button" onClick={() => setAccessDraft([])} className="rounded-md px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50">Tout interdire</button></div></div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {pages.map(page => <label key={page.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50">
                          <input type="checkbox" checked={accessDraft.includes(page.id)} onChange={event => setAccessDraft(current => event.target.checked ? [...new Set([...current, page.id])] : current.filter(id => id !== page.id))} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="min-w-0"><span className="block truncate font-medium">{page.title}</span><span className="font-mono text-[10px] text-slate-400">/page/{page.slug === 'index' ? '' : page.slug}</span></span>
                        </label>)}
                        {!pages.length && <p className="col-span-2 py-3 text-center text-xs text-slate-400">Aucune page créée pour le moment.</p>}
                      </div>
                      <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditingAccessUser(null)} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100">Annuler</button><button type="button" onClick={() => savePageAccess(user)} disabled={accessSaving} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{accessSaving ? 'Enregistrement…' : 'Enregistrer les accès'}</button></div>
                    </div>}
                  </li>
                ))}

                {!users.length && (
                  <li className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    Aucun utilisateur pour le moment.
                  </li>
                )}
              </ul>

              {/* Add User Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Ajouter un utilisateur</h3>
                    <p className="text-xs text-slate-500">Créez un nouvel accès pour un collaborateur.</p>
                  </div>
                </div>

                <form onSubmit={submit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nom d'utilisateur
                      </label>
                      <input
                        className={inputClass}
                        placeholder="ex. marie"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        minLength={2}
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mot de passe initial
                      </label>
                      <input
                        className={inputClass}
                        placeholder="8 caractères minimum"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rôle & permissions
                      </label>
                      <div className="relative">
                        <Shield className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer appearance-none"
                          value={role}
                          onChange={e => setRole(e.target.value)}
                        >
                          <option value="user">Utilisateur standard</option>
                          <option value="admin">Administrateur (Studio complet)</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-[38px] flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        <span>Créer le compte</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Changer de mot de passe</h3>
                  <p className="text-xs text-slate-500">Choisissez un mot de passe d’au moins 8 caractères.</p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ancien mot de passe
                  </label>
                  <input
                    className={inputClass}
                    placeholder="Saisissez votre ancien mot de passe"
                    type="password"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    className={inputClass}
                    placeholder="8 caractères minimum"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    className={inputClass}
                    placeholder="Saisissez-le à nouveau"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  <span>Enregistrer le nouveau mot de passe</span>
                </button>
              </form>
            </div>
          )}
        </div>

      
      </section>
    </div>
  );
}
