import { SignInScreen } from "@/components/product/sign-in-screen";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function SignInPage({
  searchParams
}: {
  searchParams?: { next?: string; reason?: string };
}) {
  const nextPath = searchParams?.next?.startsWith("/") ? searchParams.next : "/";
  const reason = searchParams?.reason === "expired" ? "expired" : undefined;
  const { locale, messages } = await getRequestI18n();
  return <SignInScreen nextPath={nextPath} reason={reason} locale={locale} messages={messages} />;
}
