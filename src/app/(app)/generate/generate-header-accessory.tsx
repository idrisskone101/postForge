import Link from "next/link";
import { Icon, buttonClass } from "@/components/workbench";

export function GenerateHeaderAccessory() {
  return (
    <Link href="/gallery" className={buttonClass("quiet", 40)}>
      <Icon name="clock" />
      History
    </Link>
  );
}
