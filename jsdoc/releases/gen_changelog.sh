#!/bin/bash
s=$(git tag --sort -version:refname)
readarray -t a <<<"$s"
for i in "${!a[@]}" ; do 
  ! [[ ${a[$i]} =~ ^v[0-9]+\. ]] && unset -v 'a[$i]'
done

if [[ "${#a[@]}" -gt 0 ]] 
then
    echo "### Tag ${a[1]}"
    git tag -l --format='%(contents)' "${a[1]}"
fi

if [[ "${#a[@]}" -gt 1 ]] 
then
    CURR="${a[1]}"
    PREV="${a[2]}"
    echo "### Commits" 
    git log --pretty=format:"- %s (%ci %cn)" ${PREV}...${CURR}
fi
