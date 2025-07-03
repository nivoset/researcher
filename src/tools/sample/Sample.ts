import { Something } from "./other";
import fs from "fs";

interface User {
  id: number;
  name: string;
}

type UserId = number | string;

type UserMap = {
  [id: string]: User;
};

export function getUser(id: UserId): User | null {
  // ...implementation
  return null;
}

function privateHelper() {
  // not exported
} 