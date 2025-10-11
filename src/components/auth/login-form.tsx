'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  AuthError,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

const formSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAuthError = (error: AuthError) => {
    let title = 'An error occurred';
    let description = error.message;

    switch (error.code) {
      case 'auth/user-not-found':
        title = 'User Not Found';
        description = 'No user found with this email. Please sign up.';
        break;
      case 'auth/wrong-password':
        title = 'Incorrect Password';
        description = 'The password you entered is incorrect. Please try again.';
        break;
      case 'auth/email-already-in-use':
        title = 'Email Already in Use';
        description = 'This email is already registered. Please log in instead.';
        break;
      case 'auth/weak-password':
        title = 'Weak Password';
        description = 'The password must be at least 6 characters long.';
        break;
      case 'auth/invalid-email':
        title = 'Invalid Email';
        description = 'The email address is not valid.';
        break;
    }

    toast({
      variant: 'destructive',
      title: title,
      description: description,
    });
  };

  async function handleSignIn(data: LoginFormValues) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push('/dashboard');
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignUp(data: LoginFormValues) {
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      // On successful sign up, the onAuthStateChanged in the layout will handle redirection
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Welcome</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form className="space-y-4">
          <CardContent className='space-y-4'>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={form.handleSubmit(handleSignUp)}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
              <Button
                type="button"
                className="w-full"
                onClick={form.handleSubmit(handleSignIn)}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
