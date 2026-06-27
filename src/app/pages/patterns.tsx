import { PatternsView } from "../components/patterns-view";
import { useStore } from "../store";

export default function PatternsPage() {
  const { history, validations } = useStore();
  return <PatternsView history={history} validations={validations} />;
}
