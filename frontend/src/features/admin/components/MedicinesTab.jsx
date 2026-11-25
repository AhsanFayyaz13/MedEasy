import MedicinesPage from '../../pharmacist/components/MedicinesPage';

/** Admin catalogue: the shared inventory page, with permanent removal enabled. */
export default function MedicinesTab() {
  return <MedicinesPage canDelete />;
}
