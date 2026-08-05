import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15 } 
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const getValidationClasses = (value: string, type: 'email' | 'password' | 'name' | 'phone') => {
  if (value.length === 0) return "border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-emerald-500";
  let isValid = false;
  if (type === 'email') isValid = /^\S+@\S+\.\S+$/.test(value);
  if (type === 'password') isValid = /^[A-Z](?=.*\d)(?=.*[^a-zA-Z\d]).{4,}$/.test(value);
  if (type === 'name') isValid = value.trim().length >= 2;
  if (type === 'phone') isValid = value.trim().length >= 8;
  return isValid
    ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500"
    : "border-red-500 focus:border-red-500 focus:ring-red-500";
};

const handleAuthError = (err: unknown, defaultMessage: string, setError: (msg: string) => void) => {
  if (axios.isAxiosError(err)) {
    setError(err.response?.data?.error || err.response?.data?.message || err.message || defaultMessage);
  } else if (err instanceof Error) {
    setError(err.message || "An unexpected error occurred.");
  } else {
    setError("An unexpected error occurred.");
  }
};

export default function SlidingAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [isLogin, setIsLogin] = useState(() => !(mode === "signup" || mode === "register"));
  useEffect(() => {
    if (mode === "signup" || mode === "register") {
      setIsLogin(false);
    } else if (mode === "login") {
      setIsLogin(true);
    }
  }, [mode]);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  
  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [phone, setPhone] = useState("")

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setError(null);
    setSuccess(null);
  };



  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try{
      await axios.post('/api/auth/login', {
        email,
        password
      });
      setSuccess("Successfully logged in! Redirecting...");
      setTimeout(() => {
        router.push("/incidents/dashboard");
      }, 1000);
    }catch(err: unknown){
      handleAuthError(err, "Invalid credentials", setError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try{
      await axios.post('/api/auth/register', {
        name: registerName,
        companyName,
        phone,
        email: registerEmail,
        password: registerPassword
      });
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => {
        toggleMode(true);
      }, 2000);
    }catch(err: unknown){
      handleAuthError(err, "Failed to create account", setError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 lg:min-h-[80vh] w-full max-w-7xl mx-auto flex-col bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-500 lg:flex-row shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
      
      {/* Sliding Image Panel */}
      <motion.div 
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`relative hidden w-full p-4 lg:flex lg:w-1/2 z-10 ${isLogin ? 'order-2' : 'order-1'}`}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-slate-900 shadow-xl">
          <img
            src="https://assets.watermelon.sh/auth-12.avif"
            alt="Abstract wavy gradient"
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
        </div>
      </motion.div>

      {/* Sliding Form Panel */}
      <motion.div 
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`flex w-full lg:w-1/2 flex-col items-center justify-center p-5 sm:p-10 lg:p-12 z-20 bg-white dark:bg-slate-900 ${isLogin ? 'order-1' : 'order-2'}`}
      >
        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="login"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-[400px]"
            >
              <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
                <h1 className="mb-2 sm:mb-3 text-3xl sm:text-4xl lg:text-[44px] font-semibold leading-[1.1] tracking-tight text-slate-900 dark:text-white">
                  Welcome
                  <br />
                  back
                </h1>
                <p className="text-xs sm:text-[14px] text-slate-500 dark:text-slate-400 text-balance">
                  You need to be signed in to access the fleet dashboard.
                </p>
              </motion.div>

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5 sm:gap-5">
                {error && (
                  <div className="rounded-md bg-red-50 dark:bg-red-950/50 p-2.5 sm:p-3 text-xs sm:text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 p-2.5 sm:p-3 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {success}
                  </div>
                )}
                <motion.div variants={itemVariants} className="flex flex-col gap-1.5 sm:gap-2">
                  <label htmlFor="login-email" className="text-xs sm:text-[14px] font-medium text-slate-800 dark:text-slate-200">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.costa@example.com"
                    className={`w-full rounded-md border bg-white dark:bg-slate-950 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(email, 'email')}`}
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label htmlFor="login-password" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 pr-10 text-[14px] font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(password, 'password')}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative flex justify-center items-center w-full rounded-md bg-emerald-500 py-3 text-[14px] font-medium text-white transition-all active:scale-[0.98] hover:bg-emerald-600 disabled:bg-emerald-600 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="flex items-center gap-2"
                        >
                          <svg className="animate-[spin_0.5s_linear_infinite] h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing in...
                        </motion.div>
                      ) : (
                        <motion.span
                          key="default"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          Sign in
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </motion.div>
              </form>

              <motion.div variants={itemVariants} className="mt-6">
                <div className="text-xs text-slate-500 mb-2 font-medium">Quick Test Login</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { role: 'Manager', email: 'manager@powerfleet.com' },
                    { role: 'Technician', email: 'tech.david@powerfleet.com' },
                    { role: 'Client', email: 'client.fleet@metrotransport.com' },
                    { role: 'Admin', email: 'admin@powerfleet.com' }
                  ].map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword("Password123!");
                      }}
                      className="p-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800/50 text-left transition-colors"
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{account.role}</div>
                      <div className="text-slate-500 dark:text-slate-400 truncate">{account.email}</div>
                    </button>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="mt-6 sm:mt-8 text-center text-xs sm:text-[14px] text-slate-500 dark:text-slate-400">
                Haven&apos;t joined yet?{" "}
                <button 
                  type="button"
                  onClick={() => toggleMode(false)}
                  className="font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                >
                  Sign up
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-[400px]"
            >
              <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
                <h1 className="mb-2 sm:mb-3 text-3xl sm:text-4xl lg:text-[44px] font-semibold leading-[1.1] tracking-tight text-slate-900 dark:text-white">
                  Join
                  <br />
                  Power Fleet
                </h1>
                <p className="text-xs sm:text-[14px] text-slate-500 dark:text-slate-400 text-balance">
                  Create your account to start managing your incidents effectively.
                </p>
              </motion.div>

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5 sm:gap-4">
                {error && (
                  <div className="rounded-md bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {success}
                  </div>
                )}
                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label htmlFor="register-name" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                    Full Name
                  </label>
                  <input
                    id="register-name"
                    name="fullName"
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="John Doe"
                    className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(registerName, 'name')}`}
                  />
                </motion.div>

                <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4">
                  <motion.div variants={itemVariants} className="flex flex-col gap-1.5 sm:gap-2 w-full sm:w-1/2">
                    <label htmlFor="register-company" className="text-xs sm:text-[14px] font-medium text-slate-800 dark:text-slate-200">
                      Company Name
                    </label>
                    <input
                      id="register-company"
                      name="companyName"
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Corp"
                      className={`w-full rounded-md border bg-white dark:bg-slate-950 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(companyName, 'name')}`}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="flex flex-col gap-1.5 sm:gap-2 w-full sm:w-1/2">
                    <label htmlFor="register-phone" className="text-xs sm:text-[14px] font-medium text-slate-800 dark:text-slate-200">
                      Phone Number
                    </label>
                    <input
                      id="register-phone"
                      name="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+212..."
                      className={`w-full rounded-md border bg-white dark:bg-slate-950 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(phone, 'phone')}`}
                    />
                  </motion.div>
                </div>

                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label htmlFor="register-email" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                    Email address
                  </label>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="john@example.com"
                    className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(registerEmail, 'email')}`}
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label htmlFor="register-password" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 pr-10 text-[14px] font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(registerPassword, 'password')}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative flex justify-center items-center w-full rounded-md bg-emerald-500 py-3 text-[14px] font-medium text-white transition-all active:scale-[0.98] hover:bg-emerald-600 disabled:bg-emerald-600 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="flex items-center gap-2"
                        >
                          <svg className="animate-[spin_0.5s_linear_infinite] h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating account...
                        </motion.div>
                      ) : (
                        <motion.span
                          key="default"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          Create account
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </motion.div>
              </form>

              <motion.div variants={itemVariants} className="mt-6 sm:mt-8 text-center text-xs sm:text-[14px] text-slate-500 dark:text-slate-400">
                Already have an account?{" "}
                <button 
                  type="button"
                  onClick={() => toggleMode(true)}
                  className="font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                >
                  Sign in
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
