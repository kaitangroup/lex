// Role-based home page router. Reads CurrentUser context and renders the
// appropriate dashboard.
import { useCurrentUser } from "@/lib/currentUser";
import Alerts from "@/pages/Alerts";
import LawyerHome from "@/pages/LawyerHome";
import ParalegalHome from "@/pages/ParalegalHome";
import BookkeeperHome from "@/pages/BookkeeperHome";

export default function Home() {
  const { role } = useCurrentUser();
  switch (role) {
    case "managing_partner":
      return <Alerts />;
    case "lawyer":
      return <LawyerHome />;
    case "paralegal":
      return <ParalegalHome />;
    case "bookkeeper":
      return <BookkeeperHome />;
  }
}
