import { CiSearch } from "react-icons/ci";

export default function SearchBar() {
    return (
        <div class="search-container">
        <input type="text" class="search-input" placeholder="Tìm kiếm..."/>
        <button class="search-button"><CiSearch/></button>
    </div>
    );
}
