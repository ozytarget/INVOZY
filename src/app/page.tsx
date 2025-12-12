import { LoginForm } from '@/components/auth/login-form-supabase';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
