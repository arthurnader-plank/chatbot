export default function LoginPage() {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow text-black">
          <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
          <form className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1 text-black"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1 text-black"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700"
            >
              Login
            </button>
          </form>
          <p className="text-center text-sm text-black mt-4">
            Don’t have an account?{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </main>
    );
  }
  