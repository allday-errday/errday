const defaultTimeZone = "Europe/Zurich";

export function todayDateString() {
  return localDateString(new Date());
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function localDateString(date = new Date(), timeZone = defaultTimeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(date);
}

function getTimeZoneOffsetMs(date: Date, timeZone = defaultTimeZone) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );

  return asUtc - date.getTime();
}

function zonedTimeToUtc(date: string, time: string, timeZone = defaultTimeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);

  return new Date(utcGuess.getTime() - offset);
}

export function localDayRange(
  date = todayDateString(),
  timeZone = defaultTimeZone,
) {
  const start = zonedTimeToUtc(date, "00:00:00", timeZone);
  const nextLocalDay = new Date(`${date}T00:00:00`);
  nextLocalDay.setDate(nextLocalDay.getDate() + 1);
  const nextDate = [
    nextLocalDay.getFullYear(),
    String(nextLocalDay.getMonth() + 1).padStart(2, "0"),
    String(nextLocalDay.getDate()).padStart(2, "0"),
  ].join("-");
  const end = zonedTimeToUtc(nextDate, "00:00:00", timeZone);

  return {
    end,
    endIso: end.toISOString(),
    start,
    startIso: start.toISOString(),
  };
}

export function shiftDateString(date: string, delta: number) {
  const base = new Date(`${date}T12:00:00`);
  base.setDate(base.getDate() + delta);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
