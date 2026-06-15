import { useState } from 'react';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Checkbox } from './components/Checkbox';
import { Mail, Lock } from 'lucide-react';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password, rememberMe });
  };

  return (
    <div className="size-full flex min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* Left Side - Login Form */}
      <div className="w-3/5 flex items-center justify-center px-16 py-16" style={{ background: '#FFFFFF' }}>
        <div className="w-full max-w-[480px] flex flex-col gap-[48px]">
          {/* Logo and Header */}
          <div className="flex flex-col gap-[12px]">
            <div className="headings-xl-bold" style={{ color: '#8B2CFF' }}>
              BRISK
            </div>
            <h1 className="headings-l-bold" style={{ color: '#0E1114' }}>
              Welcome back
            </h1>
            <p className="paragraph-m" style={{ color: '#616C76' }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-[24px]">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              iconStart={<Mail size={20} />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              iconStart={<Lock size={20} />}
            />

            <div className="flex items-center justify-between">
              <Checkbox
                label="Remember me"
                checked={rememberMe}
                onChange={setRememberMe}
              />

              <button
                type="button"
                className="label-s hover:underline"
                style={{ color: '#9F60FF' }}
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Sign in
            </Button>

            <div className="flex items-center justify-center gap-[8px]">
              <span className="label-s" style={{ color: '#616C76' }}>
                Don't have an account?
              </span>
              <button
                type="button"
                className="label-s-semibold hover:underline"
                style={{ color: '#9F60FF' }}
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Brand Image */}
      <div className="w-2/5 relative overflow-hidden border-l-[1px]" style={{ background: '#FFFFFF', borderColor: '#000000' }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1505209487757-5114235191e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080)',
          }}
        >
          {/* Overlay with brand color */}
          <div
            className="absolute inset-0 mix-blend-multiply"
            style={{
              background: 'linear-gradient(135deg, var(----brand-primary) 0%, var(----purple-70) 100%)',
              opacity: 0.15
            }}
          />
        </div>
      </div>
    </div>
  );
}