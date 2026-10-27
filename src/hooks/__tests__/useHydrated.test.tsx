import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useHydrated, useHydratedState } from "@/hooks/useHydrated";

function Probe({ id }: { id: string }) {
  const hydrated = useHydrated();
  const [value, setValue] = useHydratedState(
    id,
    () => window.localStorage.getItem(id) ?? "empty",
    "server",
  );
  return (
    <button type="button" data-hydrated={hydrated} onClick={() => setValue((v) => `${v}!`)}>
      {value}
    </button>
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("useHydratedState", () => {
  it("renders the fallback on the server", () => {
    window.localStorage.setItem("a", "stored");
    expect(renderToString(<Probe id="a" />)).toContain("server");
  });

  it("hydrates with the fallback, then switches to the stored value", async () => {
    window.localStorage.setItem("a", "stored");
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Probe id="a" />);
    document.body.appendChild(container);

    const errors: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <Probe id="a" />, {
        onRecoverableError: (error) => errors.push(error),
      });
    });

    expect(errors).toEqual([]);
    expect(container.textContent).toBe("stored");
    expect(container.querySelector("button")?.dataset.hydrated).toBe("true");
    container.remove();
  });

  it("re-reads storage when the key changes and keeps local updates otherwise", () => {
    window.localStorage.setItem("a", "first");
    window.localStorage.setItem("b", "second");
    const { rerender } = render(<Probe id="a" />);
    expect(screen.getByRole("button").textContent).toBe("first");

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("first!");

    rerender(<Probe id="a" />);
    expect(screen.getByRole("button").textContent).toBe("first!");

    rerender(<Probe id="b" />);
    expect(screen.getByRole("button").textContent).toBe("second");
  });
});
