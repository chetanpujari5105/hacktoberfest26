# Import Rules

## Use the `@/` path alias for all cross-directory imports

```ts
// Correct
import config from "@/config";
import { Button } from "@/components/Button";
import { connectDB } from "@/libs/mongoose";
import User from "@/models/User";
import { useAuth } from "@/hooks/useAuth";
```

```ts
// Wrong — relative paths crossing directory boundaries
import config from "../../config";
import { Button } from "../components/Button";
```

## When relative imports are allowed

- Only within the same directory (e.g., `./utils` from a sibling file)
- Co-located files in the same `app/` route folder referencing each other
