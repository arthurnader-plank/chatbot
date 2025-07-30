import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to Chatbot</h1>
      <p className="text-lg text-center max-w-md mb-8">
        This is your friendly chatbot project built with Next.js, Tailwind CSS, and React.
        Use the login page to access your account and start chatting!
      </p>
      <div className="flex space-x-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-white text-blue-600 font-medium rounded shadow hover:bg-gray-200 transition"
        >
          Login
        </Link>
        <Link
          href="/chat"
          className="px-6 py-3 border border-white rounded hover:bg-white hover:text-blue-600 transition"
        >
          Go to Chat
        </Link>
      </div>
    </main>
  );
}
