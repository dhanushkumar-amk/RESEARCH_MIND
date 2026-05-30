from Bio import Entrez, Medline
from langchain_core.tools import tool

@tool
def pubmed_search(query: str) -> str:
    """
    Search PubMed for medical publications, clinical studies, and biological literature.
    Input should be a search query.
    """
    Entrez.email = "contact@dhanushkumaramk.dev"
    try:
        # Search for IDs matching the query
        search_handle = Entrez.esearch(db="pubmed", term=query, retmax=5)
        search_results = Entrez.read(search_handle)
        search_handle.close()
        
        id_list = search_results.get("IdList", [])
        if not id_list:
            return f"No PubMed articles found for query: '{query}'"
            
        # Fetch Medline records for these IDs
        fetch_handle = Entrez.efetch(db="pubmed", id=id_list, rettype="medline", retmode="text")
        records = list(Medline.parse(fetch_handle))
        fetch_handle.close()
        
        results = []
        for r in records:
            title = r.get("TI", "No Title")
            authors = ", ".join(r.get("AU", []))
            journal = r.get("JT", "No Journal")
            date = r.get("DP", "No Date")
            abstract = r.get("AB", "No abstract available.")
            pmid = r.get("PMID", "")
            
            results.append(
                f"PMID: {pmid}\n"
                f"Title: {title}\n"
                f"Authors: {authors}\n"
                f"Journal: {journal} ({date})\n"
                f"Abstract:\n{abstract}\n"
            )
            
        return "\n---\n".join(results)
    except Exception as e:
        return f"Exception occurred during PubMed Search: {str(e)}"
