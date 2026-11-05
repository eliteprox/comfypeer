import { deviceLoginFromSearchParams } from "@/lib/device-login";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ iss?: string | string[]; target_link_uri?: string | string[] }>;
}) {
  const params = await searchParams;
  return <LoginForm device={deviceLoginFromSearchParams(params)} />;
}
