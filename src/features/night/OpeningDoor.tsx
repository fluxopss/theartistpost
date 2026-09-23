import Link from "next/link";
import { copy } from "@/content/site";
import type { ContentEvent } from "@/lib/content";
import { floorBeats, formatNightWhen, stampWord, nightPhase } from "@/features/night/program";

/** Door poster for the next night — the seat itself lives on /night. */
export function OpeningDoor({ event }: { event: ContentEvent }) {
  const when = formatNightWhen(event);
  const phase = nightPhase(event);
  const beats = floorBeats(event).slice(0, 3);

  return (
    <section className="opening-door" aria-labelledby="opening-title">
      <div className="opening-door__inner">
        <Link href="/night" className="night-ticket night-ticket--invite">
          <span className="night-ticket__perf" aria-hidden />
          <span className="night-ticket__face">
            <span className="night-ticket__when">
              <span className="night-ticket__dow">{when.weekday}</span>
              <span className="night-ticket__day display">{when.day}</span>
              <span className="night-ticket__mon">{when.month}</span>
            </span>
            <span className="night-ticket__rule" aria-hidden />
            <span className="night-ticket__meta">
              <span className="night-ticket__brand">The Artist Post</span>
              <span className="night-ticket__event display">{event.title}</span>
              <span className="night-ticket__hours">
                {when.time} – {when.endTime}
              </span>
              <span className="night-ticket__venue">{event.venue}</span>
            </span>
            <span className={`night-stamp night-stamp--${phase}`}>
              {stampWord(phase)}
            </span>
          </span>
          <span className="night-ticket__foot">
            {copy.night.hold}
            <span aria-hidden> →</span>
          </span>
        </Link>

        <div className="opening-door__copy">
          <p className="opening-door__kicker">{copy.night.kicker}</p>
          <h2 id="opening-title" className="display opening-door__title">
            {event.title}
          </h2>
          <p className="opening-door__lead">{copy.night.lineup}</p>
          <ol className="opening-door__beats">
            {beats.map((beat, index) => (
              <li key={beat.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {beat.title}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
