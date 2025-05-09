'use client';
import { useSearchParams, usePathname, useRouter } from "next/navigation";

export default function Search({placeholder}: {placeholder: string}) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const {replace} = useRouter();

    console.log(searchParams.get('search'));
    
    const handleSearch = (term: string) => {
        const params = new URLSearchParams(searchParams.toString());
        console.log('Searching for:', term);
        if (term) {
            params.set('search', term);
        } else {
            params.delete('search');
        }
        replace(`${pathname}?${params.toString()}`);
    }
  return (
    <div className="relative flex flex-1 flex-shrink-0 ">
        <label htmlFor="search" className="sr-only">Search</label>
        <input onChange={(e) => handleSearch(e.target.value)} className="peer block w-full rounded-md border border-gray-200 
        py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500" placeholder={placeholder} type="text" defaultValue={searchParams.get('search')?.toString()} />

       
    </div>
  );
}