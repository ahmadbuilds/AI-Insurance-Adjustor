import Link from "next/link";

export default function ConfirmEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Check Your Email
        </h1>
        <p className="mb-6 text-gray-600">
          A confirmation email has been sent with your login credentials and an
          activation link. Please click the link to verify your account, then
          use the provided credentials to log in.
        </p>

        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <p>
            Didn&apos;t receive the email? Check your spam folder or contact
            your administrator to resend it.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
