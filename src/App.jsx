import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login.jsx";
import TaskBoard from "./TaskBoard.jsx";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="min-h-full flex items-center justify-center text-sm text-slate-400">Cargando…</div>;
  }

  return session ? <TaskBoard session={session} /> : <Login />;
}
