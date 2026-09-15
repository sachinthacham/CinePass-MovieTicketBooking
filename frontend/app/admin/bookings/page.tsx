"use client";

import * as React from "react";
import { DataTable } from "@/components/ui/DataTable";
import { bookingsApi } from "@/lib/api/bookings";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { Booking, BookingStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, XCircle, Eye, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { statusBadgeClass, type StatusTone } from "@/lib/utils/statusBadge";

const STATUS_TONE: Record<BookingStatus, StatusTone> = {
  Confirmed: "success",
  Pending: "warning",
  Cancelled: "destructive",
  Refunded: "info",
  Expired: "neutral",
};

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "text-xs font-bold px-2 py-1 rounded border",
        statusBadgeClass(STATUS_TONE[status] ?? "neutral")
      )}
    >
      {status}
    </span>
  );
}

function BookingDetailModal({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const [cancelReason, setCancelReason] = React.useState("");
  const [showCancel, setShowCancel] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.adminCancel(booking.id, cancelReason),
    onSuccess: () => {
      toast({
        title: "Booking cancelled",
        description: `${booking.bookingReference} has been cancelled.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Failed",
        description: "Could not cancel booking.",
        variant: "destructive",
      });
    },
  });

  const showtimeFormatted = new Date(booking.showtimeStart).toLocaleString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Modal isOpen onClose={onClose} title="Booking Details">
      <div className="space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">{booking.movieTitle}</h3>
            <p className="text-sm text-(--muted-foreground)">
              {booking.bookingReference}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="col-span-2">
            <p className="text-xs text-(--muted-foreground) uppercase tracking-wide mb-1">
              Customer
            </p>
            <p className="font-semibold">{booking.userName}</p>
            <p className="text-(--muted-foreground)">{booking.userEmail}</p>
          </div>
          <div>
            <p className="text-xs text-(--muted-foreground) uppercase tracking-wide mb-1">
              Showtime
            </p>
            <p className="font-semibold">{showtimeFormatted}</p>
          </div>
          <div>
            <p className="text-xs text-(--muted-foreground) uppercase tracking-wide mb-1">
              Venue
            </p>
            <p className="font-semibold">{booking.theaterName}</p>
            <p className="text-(--muted-foreground)">{booking.screenName}</p>
          </div>
          <div>
            <p className="text-xs text-(--muted-foreground) uppercase tracking-wide mb-1">
              Total Amount
            </p>
            <p className="font-bold text-(--primary) text-lg">
              Rs. {booking.totalAmount}
            </p>
          </div>
          <div>
            <p className="text-xs text-(--muted-foreground) uppercase tracking-wide mb-1">
              Payment
            </p>
            <p className="font-semibold">{booking.payment?.status ?? "N/A"}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-(--muted-foreground) uppercase tracking-wide mb-2">
            Seats ({booking.items?.length ?? 0})
          </p>
          <div className="flex flex-wrap gap-2">
            {booking.items?.map((item) => (
              <span
                key={item.id}
                className="text-xs bg-(--muted) px-2 py-1 rounded font-mono"
              >
                {item.seatCategoryName} {item.rowLabel}
                {item.seatNumber}
              </span>
            ))}
          </div>
        </div>

        {booking.cancellationReason && (
          <div className="p-3 bg-(--destructive)/10 border border-(--destructive)/20 rounded-xl text-sm">
            <p className="font-medium text-(--destructive)">Cancellation Reason:</p>
            <p className="text-(--muted-foreground) mt-1">
              {booking.cancellationReason}
            </p>
          </div>
        )}

        {(booking.status === "Confirmed" || booking.status === "Pending") && (
          <div className="border-t border-(--border) pt-4">
            {showCancel ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    This will cancel the booking and initiate a refund if
                    applicable.
                  </p>
                </div>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                  rows={2}
                  className="w-full rounded-md border border-(--border) bg-(--background) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancel(false)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="flex-1"
                  >
                    {cancelMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Confirm Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full text-(--destructive) border-(--destructive)/30 hover:bg-(--destructive)/10"
                onClick={() => setShowCancel(true)}
              >
                <XCircle className="h-4 w-4 mr-2" /> Cancel Booking
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

const STATUS_FILTERS = [
  "All",
  "Confirmed",
  "Pending",
  "Cancelled",
  "Refunded",
  "Expired",
];

export default function AdminBookingsPage() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [page, setPage] = React.useState(1);
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(
    null
  );

  // Debounce the search box so it filters server-side (across all pages, not
  // just the current one) without firing a request on every keystroke. Also
  // resets back to page 1 here, since a new search term invalidates whatever
  // page the user was on (the statusFilter click handler resets it directly).
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings", statusFilter, page, debouncedSearch],
    queryFn: () =>
      bookingsApi.adminGetAll({
        page,
        pageSize: 15,
        status: statusFilter !== "All" ? statusFilter : undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const bookings: Booking[] = data?.data?.data?.items ?? [];
  const totalCount = data?.data?.data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / 15);

  const columns = [
    {
      key: "bookingReference",
      header: "Reference",
      render: (b: Booking) => (
        <span className="font-mono text-xs font-bold">
          {b.bookingReference}
        </span>
      ),
    },
    {
      key: "userName",
      header: "Customer",
      render: (b: Booking) => (
        <div>
          <p className="font-medium text-sm">{b.userName}</p>
          <p className="text-xs text-(--muted-foreground)">{b.userEmail}</p>
        </div>
      ),
    },
    {
      key: "movieTitle",
      header: "Movie",
      render: (b: Booking) => (
        <div>
          <p className="font-medium text-sm">{b.movieTitle}</p>
          <p className="text-xs text-(--muted-foreground)">
            {new Date(b.showtimeStart).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      ),
    },
    {
      key: "theaterName",
      header: "Theatre",
      render: (b: Booking) => <span className="text-sm">{b.theaterName}</span>,
    },
    {
      key: "seats",
      header: "Seats",
      render: (b: Booking) => (
        <span className="text-sm font-medium">{b.items?.length ?? 0}</span>
      ),
    },
    {
      key: "totalAmount",
      header: "Amount",
      render: (b: Booking) => (
        <span className="font-bold text-(--primary)">Rs. {b.totalAmount}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (b: Booking) => <StatusBadge status={b.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-(--font-display) text-2xl font-bold tracking-tight">
          Booking Management
        </h1>
        <p className="text-(--muted-foreground) text-sm mt-1">
          {totalCount} total booking{totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--muted-foreground)" />
          <Input
            placeholder="Search by reference, movie, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                statusFilter === s
                  ? "bg-(--primary) text-(--primary-foreground) border-(--primary)"
                  : "border-(--border) text-(--muted-foreground) hover:border-(--primary)"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={bookings}
        isLoading={isLoading}
        emptyMessage="No bookings found."
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        actions={(b) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedBooking(b)}
          >
            <Eye className="h-4 w-4 mr-1" /> View
          </Button>
        )}
      />

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}
