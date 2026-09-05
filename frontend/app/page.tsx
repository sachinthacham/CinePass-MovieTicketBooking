"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Play, ChevronRight, MapPin, SortAsc, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MovieCard } from "@/components/ui/MovieCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { moviesApi } from "@/lib/api/movies";
import { genresApi } from "@/lib/api/genres";
import { languagesApi } from "@/lib/api/languages";
import { theatersApi } from "@/lib/api/theaters";
import { showFormatsApi } from "@/lib/api/showtimes";
import { cn } from "@/lib/utils";
import { getMoviePosterUrl } from "@/lib/utils/posterUrl";
import { useLocationStore } from "@/lib/stores/locationStore";
import type { Genre, Language, Movie } from "@/lib/types";

function getHeroMovie(movies: Movie[]) {
  return movies.find((m) => m.isFeatured) ?? movies[0];
}

const SORT_OPTIONS = [
  { label: "Latest", value: "releaseDate" },
  { label: "Top Rated", value: "rating" },
  { label: "A-Z", value: "title" },
];

export default function HomePage() {
  const [selectedGenre, setSelectedGenre] = React.useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>("");
  const { selectedCity, setSelectedCity } = useLocationStore();
  const [selectedFormat, setSelectedFormat] = React.useState<string>("");
  const [sortBy, setSortBy] = React.useState<string>("releaseDate");
  const [showCityDropdown, setShowCityDropdown] = React.useState(false);
  const [showSortDropdown, setShowSortDropdown] = React.useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = React.useState(false);
  const [showGenreDropdown, setShowGenreDropdown] = React.useState(false);

  const { data: nowShowingData, isLoading: loadingNow } = useQuery({
    queryKey: [
      "movies",
      "now-showing",
      selectedGenre,
      selectedLanguage,
      selectedCity,
      selectedFormat,
      sortBy,
    ],
    queryFn: () =>
      moviesApi.getAll({
        isComingSoon: false,
        genreId: selectedGenre || undefined,
        languageId: selectedLanguage || undefined,
        city: selectedCity || undefined,
        formatId: selectedFormat || undefined,
        sortBy: sortBy || undefined,
        pageSize: 12,
      }),
  });

  const { data: comingSoonData, isLoading: loadingCS } = useQuery({
    queryKey: ["movies", "coming-soon"],
    queryFn: () => moviesApi.getAll({ isComingSoon: true, pageSize: 8 }),
  });

  const { data: genresData } = useQuery({
    queryKey: ["genres"],
    queryFn: genresApi.getAll,
  });
  const { data: languagesData } = useQuery({
    queryKey: ["languages"],
    queryFn: languagesApi.getAll,
  });
  const { data: citiesData } = useQuery({
    queryKey: ["theater-cities"],
    queryFn: theatersApi.getCities,
  });
  const { data: formatsData } = useQuery({
    queryKey: ["show-formats"],
    queryFn: showFormatsApi.getAll,
  });

  const nowShowing = nowShowingData?.data?.items ?? [];
  const comingSoon = comingSoonData?.data?.items ?? [];
  const genres = genresData?.data ?? [];
  const languages = languagesData?.data ?? [];
  const cities: string[] = citiesData?.data ?? [];
  const formats = formatsData?.data ?? [];
  const hero = getHeroMovie(nowShowing);

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Latest";
  const activeLanguageLabel =
    languages.find((lang: Language) => lang.id === selectedLanguage)?.name ??
    "All Languages";
  const activeGenreLabel =
    genres.find((genre: Genre) => genre.id === selectedGenre)?.name ??
    "All Genres";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-(--background)">
        <div className="absolute inset-0 z-0">
          <div
            className="h-full w-full bg-cover bg-center opacity-30 blur-sm"
            style={{
              backgroundImage: hero
                ? `url(${getMoviePosterUrl(hero)})`
                : `url(https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1600&h=600&fit=crop)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-(--background) via-(--background)/80 to-transparent" />
        </div>
        <div className="container relative z-10 mx-auto px-4 py-20 md:px-8 lg:py-32">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex rounded-full bg-(--primary)/20 px-3 py-1 text-sm font-semibold text-(--primary)">
              🔥 Now Showing
            </div>
            <h1 className="font-(--font-display) text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {hero?.title ?? "The Best Movies"}
            </h1>
            <p className="max-w-xl text-lg text-(--muted-foreground) md:text-xl">
              {hero?.description?.slice(0, 150) ??
                "Book your tickets for the latest blockbusters at cinemas near you."}
            </p>
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
              {hero && (
                <Link href={`/movies/${hero.id}`}>
                  <Button size="lg" className="rounded-full px-8 text-base">
                    Book Tickets
                  </Button>
                </Link>
              )}
              {hero?.trailers?.[0] && (
                <a
                  href={hero.trailers[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full px-8 text-base backdrop-blur-md"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Watch Trailer
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Filters Bar */}
      <section className="relative z-40 w-full border-y border-(--border) bg-(--background)/95 backdrop-blur py-3">
        <div className="container mx-auto px-4 md:px-8 flex flex-wrap items-center gap-3">
          {/* City picker */}
          {cities.length > 0 && (
            <div className="relative shrink-0">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-(--border) text-sm font-medium hover:border-(--primary) transition-colors"
                onClick={() => {
                  setShowCityDropdown((v) => !v);
                  setShowSortDropdown(false);
                  setShowLanguageDropdown(false);
                  setShowGenreDropdown(false);
                }}
              >
                <MapPin className="h-3.5 w-3.5" />
                {selectedCity || "All Cities"}
              </button>
              {showCityDropdown && (
                <div className="absolute top-full mt-1 left-0 bg-(--background) border border-(--border) rounded-xl shadow-xl z-50 min-w-[160px] py-1">
                  <button
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm hover:bg-(--muted)",
                      !selectedCity && "font-bold text-(--primary)",
                    )}
                    onClick={() => {
                      setSelectedCity("");
                      setShowCityDropdown(false);
                    }}
                  >
                    All Cities
                  </button>
                  {cities.map((city) => (
                    <button
                      key={city}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-(--muted)",
                        selectedCity === city && "font-bold text-(--primary)",
                      )}
                      onClick={() => {
                        setSelectedCity(city);
                        setShowCityDropdown(false);
                      }}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sort */}
          <div className="relative shrink-0">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-(--border) text-sm font-medium hover:border-(--primary) transition-colors"
              onClick={() => {
                setShowSortDropdown((v) => !v);
                setShowCityDropdown(false);
                setShowLanguageDropdown(false);
                setShowGenreDropdown(false);
              }}
            >
              <SortAsc className="h-3.5 w-3.5" />
              {activeSortLabel}
            </button>
            {showSortDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-(--background) border border-(--border) rounded-xl shadow-xl z-50 min-w-[140px] py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm hover:bg-(--muted)",
                      sortBy === opt.value && "font-bold text-(--primary)",
                    )}
                    onClick={() => {
                      setSortBy(opt.value);
                      setShowSortDropdown(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-(--border) mx-1 shrink-0" />

          {/* Language dropdown */}
          <div className="relative shrink-0">
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                selectedLanguage
                  ? "border-(--primary) text-(--primary)"
                  : "border-(--border) hover:border-(--primary)",
              )}
              onClick={() => {
                setShowLanguageDropdown((v) => !v);
                setShowCityDropdown(false);
                setShowSortDropdown(false);
                setShowGenreDropdown(false);
              }}
            >
              {activeLanguageLabel}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showLanguageDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-(--background) border border-(--border) rounded-xl shadow-xl min-w-[180px] py-1 z-1000">
                <button
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-(--muted)",
                    !selectedLanguage && "font-bold text-(--primary)",
                  )}
                  onClick={() => {
                    setSelectedLanguage("");
                    setShowLanguageDropdown(false);
                  }}
                >
                  All Languages
                </button>
                {languages.map((lang: Language) => (
                  <button
                    key={lang.id}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm hover:bg-(--muted)",
                      selectedLanguage === lang.id &&
                        "font-bold text-(--primary)",
                    )}
                    onClick={() => {
                      setSelectedLanguage(lang.id);
                      setShowLanguageDropdown(false);
                    }}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-(--border) mx-1 shrink-0" />

          {/* Genre dropdown */}
          <div className="relative shrink-0">
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                selectedGenre
                  ? "border-(--primary) text-(--primary)"
                  : "border-(--border) hover:border-(--primary)",
              )}
              onClick={() => {
                setShowGenreDropdown((v) => !v);
                setShowCityDropdown(false);
                setShowSortDropdown(false);
                setShowLanguageDropdown(false);
              }}
            >
              {activeGenreLabel}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showGenreDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-(--background) border border-(--border) rounded-xl shadow-xl z-50 min-w-[180px] py-1">
                <button
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-(--muted)",
                    !selectedGenre && "font-bold text-(--primary)",
                  )}
                  onClick={() => {
                    setSelectedGenre("");
                    setShowGenreDropdown(false);
                  }}
                >
                  All Genres
                </button>
                {genres.map((genre: Genre) => (
                  <button
                    key={genre.id}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm hover:bg-(--muted)",
                      selectedGenre === genre.id &&
                        "font-bold text-(--primary)",
                    )}
                    onClick={() => {
                      setSelectedGenre(genre.id);
                      setShowGenreDropdown(false);
                    }}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 md:px-8 space-y-16">
        {/* Now Showing */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Now Showing
              </h2>
              {(selectedGenre || selectedLanguage || selectedCity) && (
                <p className="text-sm text-(--muted-foreground) mt-1">
                  Filtered results
                  <button
                    className="ml-2 text-(--primary) hover:underline"
                    onClick={() => {
                      setSelectedGenre("");
                      setSelectedLanguage("");
                      setSelectedCity("");
                    }}
                  >
                    Clear filters
                  </button>
                </p>
              )}
            </div>
            <Link
              href="/movies"
              className="text-sm font-medium text-(--primary) hover:underline flex items-center gap-1"
            >
              See all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {loadingNow ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
              ))}
            </div>
          ) : nowShowing.length === 0 ? (
            <p className="text-(--muted-foreground) text-center py-12">
              No movies found for the selected filters.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {nowShowing.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          )}
        </section>

        {/* Coming Soon */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Coming Soon
            </h2>
            <Link
              href="/movies?comingSoon=true"
              className="text-sm font-medium text-(--primary) hover:underline flex items-center gap-1"
            >
              Explore all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {loadingCS ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
              ))}
            </div>
          ) : comingSoon.length === 0 ? (
            <p className="text-(--muted-foreground) text-center py-12">
              No upcoming movies.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {comingSoon.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
