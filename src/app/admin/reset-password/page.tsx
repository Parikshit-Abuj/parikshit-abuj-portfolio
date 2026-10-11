import { requireOwner } from "@/lib/data";
import { AuthForm } from "@/components/auth-form";
export default async function ResetPassword() { await requireOwner(); return <AuthForm configured reset />; }
