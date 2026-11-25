// Inicio de sesión del panel con Supabase Auth.
// Solo entran los correos que estén en la tabla «admins» (ver supabase/carta-local.sql).
// Ojo: lo que de verdad protege los datos son las reglas RLS de Supabase; esto solo
// muestra u oculta la interfaz.
import { supabase } from './supabase-cliente.js';

function el(id) {
  return document.getElementById(id);
}

function mostrarLogin(mensaje) {
  el('admin-login').hidden = false;
  el('admin-app').hidden = true;
  const error = el('admin-login-error');
  error.textContent = mensaje || '';
  error.hidden = !mensaje;
  const boton = el('admin-login-btn');
  boton.disabled = false;
  boton.textContent = 'Entrar';
}

function mostrarPanel(email) {
  el('admin-login').hidden = true;
  el('admin-app').hidden = false;
  el('admin-sesion-correo').textContent = email || '';
}

async function verificarAdmin() {
  const { data, error } = await supabase.rpc('es_admin');
  if (error) {
    console.error('No se pudo verificar el administrador:', error);
    return { ok: false, mensaje: 'No se pudo verificar la cuenta. ¿Ya corriste el SQL en Supabase?' };
  }
  if (!data) return { ok: false, mensaje: 'Esta cuenta no tiene permiso de administrador.' };
  return { ok: true };
}

export function requerirSesion(alEntrar) {
  let panelIniciado = false;

  async function entrarConSesion(session) {
    const verificacion = await verificarAdmin();
    if (!verificacion.ok) {
      await supabase.auth.signOut();
      mostrarLogin(verificacion.mensaje);
      return;
    }
    mostrarPanel(session.user.email);
    if (!panelIniciado) {
      panelIniciado = true;
      alEntrar();
    }
  }

  supabase.auth.getSession().then(function (resultado) {
    const session = resultado.data && resultado.data.session;
    if (session) entrarConSesion(session);
    else mostrarLogin('');
  });

  el('admin-login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = el('admin-login-email').value.trim().toLowerCase();
    const password = el('admin-login-password').value;
    if (!email || !password) {
      mostrarLogin('Escribe tu correo y tu contraseña.');
      return;
    }

    const boton = el('admin-login-btn');
    boton.disabled = true;
    boton.textContent = 'Entrando…';

    const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password });
    el('admin-login-password').value = '';
    if (error || !data.session) {
      mostrarLogin('Correo o contraseña incorrectos.');
      return;
    }
    entrarConSesion(data.session);
  });

  el('admin-salir-btn').addEventListener('click', async function () {
    await supabase.auth.signOut();
    window.location.reload();
  });
}
