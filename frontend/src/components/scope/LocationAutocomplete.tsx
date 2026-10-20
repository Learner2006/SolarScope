import React, { useState, useRef, useEffect } from "react";
import { CityLocation, searchCities } from "../../config/cities";
import { Search, X, Compass, Globe } from "lucide-react";
import { formatCoordinates } from "../../utils/formatting";

interface LocationAutocompleteProps {
  selectedCity: CityLocation | null;
  onSelectCity: (city: CityLocation) => void;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  selectedCity,
  onSelectCity,
}) => {
  const [inputValue, setInputValue] = useState<string>(
    selectedCity ? `${selectedCity.name}, ${selectedCity.country}` : ""
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input value when selectedCity changes externally
  useEffect(() => {
    if (selectedCity) {
      setInputValue(`${selectedCity.name}, ${selectedCity.country}`);
    }
  }, [selectedCity]);

  // Suggestions based on user typing
  const suggestions = searchCities(inputValue, 8);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlight index when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue]);

  const handleSelect = (city: CityLocation) => {
    onSelectCity(city);
    setInputValue(`${city.name}, ${city.country}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(suggestions.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <div
          style={{
            position: "absolute",
            left: "0.875rem",
            color: "var(--text-tertiary)",
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <Search size={18} />
        </div>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="city-suggestions-list"
          placeholder="Search city (e.g. type 'de' for Delhi, Denver, Detroit...)"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          data-testid="location-search-input"
          style={{
            width: "100%",
            padding: "0.75rem 2.5rem 0.75rem 2.5rem",
            fontSize: "0.9375rem",
            fontWeight: 500,
            borderRadius: "var(--radius-sm)",
            border: "1.5px solid var(--border-default)",
            outline: "none",
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            borderColor: isOpen ? "var(--emerald-500)" : "var(--border-default)",
            boxShadow: isOpen ? "0 0 0 3px rgba(5, 150, 105, 0.12)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        />

        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue("");
              inputRef.current?.focus();
              setIsOpen(true);
            }}
            style={{
              position: "absolute",
              right: "0.75rem",
              background: "none",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "0.25rem",
            }}
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div
          id="city-suggestions-list"
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "var(--bg-primary)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            maxHeight: "320px",
            overflowY: "auto",
            zIndex: 50,
          }}
        >
          {suggestions.length === 0 ? (
            <div
              style={{
                padding: "1rem",
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
              }}
            >
              No matching city found in local database for &ldquo;{inputValue}&rdquo;.
            </div>
          ) : (
            suggestions.map((city, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <div
                  key={city.id}
                  role="option"
                  aria-selected={isHighlighted}
                  data-testid={`city-suggestion-${city.id}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(city)}
                  style={{
                    padding: "0.75rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    backgroundColor: isHighlighted ? "var(--emerald-50)" : "transparent",
                    borderBottom:
                      index < suggestions.length - 1
                        ? "1px solid var(--border-light, #f1f5f9)"
                        : "none",
                    transition: "background-color 0.1s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ color: isHighlighted ? "var(--emerald-600)" : "var(--text-tertiary)" }}>
                      <Globe size={18} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.9375rem",
                          fontWeight: 600,
                          color: isHighlighted ? "var(--emerald-900)" : "var(--text-primary)",
                        }}
                      >
                        {city.name}, <span style={{ fontWeight: 400 }}>{city.country}</span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                          marginTop: "0.15rem",
                        }}
                      >
                        {city.region && <span>{city.region}</span>}
                        <span>•</span>
                        <span>{formatCoordinates(city.latitude, city.longitude, 2)}</span>
                        <span>•</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                          <Compass size={12} />
                          Tilt {city.defaultTilt}°
                        </span>
                      </div>
                    </div>
                  </div>

                  {city.isBenchmarkFixture ? (
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "10px",
                        backgroundColor: "var(--emerald-100)",
                        color: "var(--emerald-800)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      MERRA-2 Fixture
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "10px",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Clear-Sky Model
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
