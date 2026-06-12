import { useNavigate } from "react-router";
import { PatternsView } from "../components/patterns-view";
import { useStore } from "../store";

export default function PatternsPage() {
  const navigate = useNavigate();
  const { history, validations } = useStore();
  return (
    <div className="flex-1 min-h-0">
      <PatternsView history={history} validations={validations} onClose={() => navigate(-1)} />
    </div>
  );
}
