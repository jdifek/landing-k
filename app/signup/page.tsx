'use client'

import $api from '@/lib/http'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function Register() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [repeatedPassword, setRepeatedPassword] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const router = useRouter()
	const { login } = useAuth()

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault()
		if (password !== repeatedPassword) {
			setError('Passwords do not match')
			return
		}
		setIsLoading(true)
		try {
			console.log('Sending registration request:', { email, password })
			const res = await $api.post('/user/register', {
				email,
				password,
				repeatedPassword,
			})
			console.log('Registration response:', res.data)
			router.push('/login')
		} catch (err: any) {
			console.error('Registration error:', err.response?.data || err.message)
			setError(err.response?.data?.message || 'Registration error')
		} finally {
			setIsLoading(false)
		}
	}

	const handleGoogleRegister = async (credentialResponse: any) => {
		try {
			const decoded: any = jwtDecode(credentialResponse.credential)
			const googleEmail = decoded.email
			console.log(
				'Sending Google registration request:',
				credentialResponse.credential
			)
			console.log('Google OAuth credentials:', credentialResponse)
			const res = await $api.post('/user/google', {
				credentials: credentialResponse.credential,
			})
			console.log('Google registration response:', res.data)
			const { access_token, refresh_token, user_details } = res.data || {}
			const tier = user_details?.tier || 'FREE'
			if (access_token && refresh_token) {
				await login(access_token, refresh_token, googleEmail, tier)
				router.push('/')
			} else {
				router.push('/login')
			}
		} catch (err: any) {
			console.error(
				'Google registration error:',
				err.response?.data || err.message
			)
			setError(err.response?.data?.message || 'Google registration error')
		}
	}

	return (
		<section className='min-h-screen flex items-center justify-center bg-background relative overflow-hidden'>
			<div className='absolute inset-0 w-full h-full'>
				<div className='absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-3xl' />
				<div className='absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/20 rounded-full blur-3xl' />
			</div>

			<div className='container mx-auto px-4 relative z-10'>
				<div className='max-w-md mx-auto bg-secondary/50 rounded-xl p-8 backdrop-blur-sm'>
					<h2 className='text-3xl md:text-4xl font-bold text-center gradient-text mb-6'>
						Registration
					</h2>
					{error && <p className='text-red-500 text-center mb-4'>{error}</p>}
					<form onSubmit={handleRegister} className='space-y-6'>
						<div>
							<label
								className='block text-muted-foreground mb-2'
								htmlFor='email'
							>
								Email
							</label>
							<input
								type='email'
								id='email'
								value={email}
								onChange={e => setEmail(e.target.value)}
								className='w-full p-3 rounded-lg bg-background border border-muted-foreground/20 text-white focus:outline-none focus:ring-2 focus:ring-primary'
								required
							/>
						</div>
						<div>
							<label
								className='block text-muted-foreground mb-2'
								htmlFor='password'
							>
								Password
							</label>
							<input
								type='password'
								id='password'
								value={password}
								onChange={e => setPassword(e.target.value)}
								className='w-full p-3 rounded-lg bg-background border border-muted-foreground/20 text-white focus:outline-none focus:ring-2 focus:ring-primary'
								required
							/>
						</div>
						<div>
							<label
								className='block text-muted-foreground mb-2'
								htmlFor='repeatedPassword'
							>
								Repeat Password
							</label>
							<input
								type='password'
								id='repeatedPassword'
								value={repeatedPassword}
								onChange={e => setRepeatedPassword(e.target.value)}
								className='w-full p-3 rounded-lg bg-background border border-muted-foreground/20 text-white focus:outline-none focus:ring-2 focus:ring-primary'
								required
							/>
						</div>
						<button
							type='submit'
							className='w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition flex items-center justify-center'
						>
							{isLoading ? (
								<>
									<Loader2 className='mr-2 h-5 w-5 animate-spin' />
									Signin up...
								</>
							) : (
								'Sign up'
							)}
						</button>
					</form>

					<div className='my-6 text-center text-muted-foreground'>or</div>

					<GoogleOAuthProvider
						clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
					>
						<div className='flex justify-center'>
							<GoogleLogin
								onSuccess={handleGoogleRegister}
								onError={() => setError('Google registration error')}
							/>
						</div>
					</GoogleOAuthProvider>

					<p className='text-center text-muted-foreground mt-6'>
						Already have an account?{' '}
						<a href='/login' className='text-primary hover:underline'>
							Log in
						</a>
					</p>
				</div>
			</div>
		</section>
	)
}
