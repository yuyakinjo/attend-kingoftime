import { userNumber } from "./config";

export class Action {
  static ATTEND = "attend";
  static LEAVE = "leave";
}

class Location {
  static OFFICE = "office";
  static REMOTE = "remote";
}

export class Timestamp {
  userId = "userNumber";
  time: number = Date.now();
  action = Action.ATTEND;
  location = Location.OFFICE;
  note = "";
}
