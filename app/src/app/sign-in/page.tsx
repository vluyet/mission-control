import { SignInScreen } from "@/components/product/sign-in-screen";

export default function SignInPage({
  searchParams
}: {
  searchParams?: { next?: string; reason?: string };
}) {
  const nextPath = searchParams?.next?.startsWith("/") ? searchParams.next : "/";
  const reason = searchParams?.reason === "expired" ? "expired" : undefined;
  return <SignInScreen nextPath={nextPath} reason={reason} />;
}
