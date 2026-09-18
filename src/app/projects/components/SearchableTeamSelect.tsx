"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X, Users, User, ShieldCheck } from "lucide-react";

export interface TeamMemberOption {
  id: string;
  fullName: string;
  role?: string;
  department?: string;
}

interface SearchableTeamSelectProps {
  label: string;
  subtitle?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  users: TeamMemberOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  badgeTheme?: "red" | "dark";
  disabled?: boolean;
}

export default function SearchableTeamSelect({
  label,
  subtitle,
  placeholder = "คลิกเพื่อค้นหาและเลือก...",
  searchPlaceholder = "พิมพ์เพื่อค้นหาชื่อ หรือแผนก...",
  users,
  selectedIds,
  onChange,
  badgeTheme = "red",
  disabled = false,
}: SearchableTeamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const q = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
    );
  }, [users, searchTerm]);

  // Selected user objects
  const selectedUsers = useMemo(() => {
    const set = new Set(selectedIds);
    return users.filter((u) => set.has(u.id));
  }, [users, selectedIds]);

  const toggleUser = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const removeUser = (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(selectedIds.filter((id) => id !== userId));
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    filteredUsers.forEach((u) => newSet.add(u.id));
    onChange(Array.from(newSet));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const isRed = badgeTheme === "red";

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {/* Header with Title and Selected Count Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            {isRed ? (
              <Users size={13} className="text-red-600" />
            ) : (
              <ShieldCheck size={13} className="text-gray-700" />
            )}
            <span>{label}</span>
          </label>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isRed
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-gray-100 text-gray-800 border-gray-200"
              }`}
          >
            {selectedIds.length} คน
          </span>
        </div>

        {selectedIds.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-bold text-gray-400 hover:text-red-600 transition-colors"
          >
            ล้างทั้งหมด
          </button>
        )}
      </div>

      {/* Main Select Box (Trigger & Tags Container) */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[46px] p-2 bg-white border rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all shadow-xs ${isOpen
          ? isRed
            ? "border-red-500 ring-2 ring-red-500/10"
            : "border-gray-800 ring-2 ring-gray-900/10"
          : "border-gray-200 hover:border-gray-300"
          } ${disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {selectedUsers.length > 0 ? (
            selectedUsers.map((user) => (
              <span
                key={user.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${isRed
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-gray-100 text-gray-800 border-gray-200"
                  }`}
              >
                <span className="w-4 h-4 rounded-full bg-white text-gray-700 text-[9px] font-bold flex items-center justify-center border border-gray-200 shrink-0">
                  {user.fullName?.charAt(0) || "?"}
                </span>
                <span className="truncate max-w-[140px]">{user.fullName}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeUser(user.id, e)}
                    className="p-0.5 rounded-full hover:bg-black/10 text-current transition-colors"
                    title="นำออก"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400 font-medium px-1 flex items-center gap-1.5">
              <Search size={13} className="text-gray-400" />
              <span>{placeholder}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-gray-400 pr-1 shrink-0">
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-gray-700" : ""
              }`}
          />
        </div>
      </div>

      {subtitle && (
        <p className="text-[11px] text-gray-400 font-medium">{subtitle}</p>
      )}

      {/* Dropdown Popover */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 text-gray-900 font-medium transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between text-[11px] px-1 text-gray-500 font-semibold border-b border-gray-100 pb-2">
            <span>
              พบ {filteredUsers.length} คน{" "}
              {searchTerm && `(จากคำค้น "${searchTerm}")`}
            </span>
            <div className="flex items-center gap-2">
              {filteredUsers.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`font-bold hover:underline ${isRed ? "text-red-600" : "text-gray-900"
                    }`}
                >
                  เลือกทั้งหมด
                </button>
              )}
              {selectedIds.length > 0 && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-gray-400 hover:text-red-600 font-bold hover:underline"
                  >
                    ล้างการเลือก
                  </button>
                </>
              )}
            </div>
          </div>

          {/* User List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 p-0.5">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${isSelected
                      ? isRed
                        ? "bg-red-50/70 border border-red-200/60"
                        : "bg-gray-100 border border-gray-200"
                      : "hover:bg-gray-50 border border-transparent"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${isSelected
                          ? isRed
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-gray-900 text-white border-gray-900"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                      >
                        {user.fullName?.charAt(0) || "?"}
                      </div>
                      <div className="truncate text-left">
                        <p
                          className={`text-xs font-bold truncate ${isSelected
                            ? isRed
                              ? "text-red-700"
                              : "text-gray-900"
                            : "text-gray-800"
                            }`}
                        >
                          {user.fullName}
                        </p>
                        {user.role && (
                          <p className="text-[10px] text-gray-400 font-medium truncate">
                            {user.role} {user.department && `• ${user.department}`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors border ${isSelected
                        ? isRed
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-gray-900 text-white border-gray-900"
                        : "border-gray-300 bg-white"
                        }`}
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-gray-400">
                ไม่พบสมาชิกที่ตรงกับการค้นหา
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
