'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { signup } from '../../../features/auth/auth-api';
import { useShellStore } from '../../../features/shell/shell-store';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { ApiError } from '../../../lib/api';

export default function SignupPage() {
  const router = useRouter();
  const setCurrentWorkspaceId = useShellStore((state) => state.setCurrentWorkspaceId);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => signup({ name, email, password }),
    onSuccess: (result) => {
      setCurrentWorkspaceId(result.personalWorkspace.id);
      router.replace(`/w/${result.personalWorkspace.id}`);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Signup failed');
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your space</CardTitle>
          <CardDescription>
            Sign up and get a personal workspace. Shared workspaces come later when you invite people.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link className="font-medium text-foreground underline" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
