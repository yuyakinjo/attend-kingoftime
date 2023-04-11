import { List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export default async function Command() {
  await LocalStorage.setItem("favorite-fruit", "apple");
  const item = await LocalStorage.getItem<string>("favorite-fruit");
  console.log(item);
}
