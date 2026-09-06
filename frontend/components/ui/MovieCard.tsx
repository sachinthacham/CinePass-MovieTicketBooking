import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import type { Movie } from "@/lib/types"
import { getMoviePosterUrl } from "@/lib/utils/posterUrl"

export function MovieCard({ movie }: { movie: Movie }) {
  const genreLabel = (movie.genres ?? []).map((g) => g.name).join(", ")
  const releaseDateLabel = movie.isComingSoon
    ? new Date(movie.releaseDate).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : undefined

  return (
    <Link href={`/movies/${movie.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-transparent bg-transparent shadow-none transition-all hover:scale-[1.02]">
        <CardContent className="p-0">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-(--muted)">
            <Image
              src={getMoviePosterUrl(movie)}
              alt={movie.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {movie.isComingSoon ? (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 text-white">
                <span className="text-sm font-medium">{releaseDateLabel}</span>
              </div>
            ) : (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 text-white">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-current text-(--primary)" />
                  <span className="text-sm font-bold">{(movie.averageRating ?? 0).toFixed(1)}</span>
                  <span className="text-xs opacity-70">({movie.totalRatings})</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-1">
            <h3 className="line-clamp-1 text-lg font-bold text-(--foreground) group-hover:text-(--primary)">
              {movie.title}
            </h3>
            <p className="line-clamp-1 text-sm text-(--muted-foreground)">
              {genreLabel}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
